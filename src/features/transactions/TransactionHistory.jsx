import { useEffect, useMemo, useState } from "react";
import { getFinancialData } from "../../services/financeDataService";
import "./TransactionHistory.css";

const money = (value) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value) || 0);

const round = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const labels = {
  income: "Ingreso",
  expense: "Gasto",
  debt_payment: "Pago de deuda",
  saving_contribution: "Aporte a meta",
  saving_return: "Retiro a cuenta",
  saving_spend: "Gasto desde ahorro",
};

const isValidAmount = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

function buildMovements({
  transactions,
  debtPayments,
  savingsMovements,
  accounts,
}) {
  const transactionMovements = transactions.map((transaction) => {
    const amount = Number(transaction.amount) || 0;
    const delta =
      transaction.type === "income" ? amount : -amount;

    return {
      ...transaction,
      key: `t-${transaction.id}`,
      accountName:
        accounts.find((account) => account.id === transaction.accountId)
          ?.name ||
        transaction.account ||
        "",
      delta,
      totalDelta: delta,
    };
  });

  const debtMovements = debtPayments.map((payment) => {
    const amount = Number(payment.amount) || 0;

    return {
      ...payment,
      key: `d-${payment.id}`,
      description: `Pago de deuda: ${payment.debtName}`,
      type: "debt_payment",
      category: "Deudas",
      accountName: payment.accountName || "",
      delta: -amount,
      totalDelta: -amount,
    };
  });

  const savingMovements = savingsMovements.map((saving) => {
    const amount = Number(saving.amount) || 0;

    const delta =
      saving.type === "saving_contribution"
        ? -amount
        : saving.type === "saving_return"
          ? amount
          : 0;

    return {
      ...saving,
      key: `s-${saving.id}`,
      description:
        saving.type === "saving_spend"
          ? saving.description ||
            `Gasto desde ahorro: ${saving.goalName}`
          : `${labels[saving.type] || "Movimiento"}: ${saving.goalName}`,
      category:
        saving.type === "saving_spend"
          ? saving.category || "Otros"
          : "Metas de ahorro",
      accountName:
        saving.accountName ||
        (saving.type === "saving_spend"
          ? "Ahorro reservado"
          : ""),
      delta,
      totalDelta:
        saving.type === "saving_spend" ? -amount : 0,
    };
  });

  const chronological = [
    ...transactionMovements,
    ...debtMovements,
    ...savingMovements,
  ].sort(
    (a, b) =>
      String(a.date || "").localeCompare(String(b.date || "")) ||
      String(a.createdAt || "").localeCompare(
        String(b.createdAt || "")
      ) ||
      String(a.key).localeCompare(String(b.key))
  );

  const currentBalances = Object.fromEntries(
    accounts.map((account) => [
      account.id,
      Number(account.balance) || 0,
    ])
  );

  const available = accounts.reduce(
    (sum, account) => sum + (Number(account.balance) || 0),
    0
  );

  const initialState = {
    balances: currentBalances,
    available,
    movements: [],
  };

  const result = [...chronological]
    .reverse()
    .reduce((state, movement) => {
      const accountExists =
        movement.accountId != null &&
        Object.hasOwn(state.balances, movement.accountId);

      const accountDelta = Number(movement.delta) || 0;

      const balanceAfter =
        accountExists && accountDelta !== 0
          ? state.balances[movement.accountId]
          : null;

      const availableAfter = state.available;

      const nextBalances =
        accountExists && accountDelta !== 0
          ? {
              ...state.balances,
              [movement.accountId]: round(
                state.balances[movement.accountId] - accountDelta
              ),
            }
          : state.balances;

      const nextAvailable = round(
        state.available - (accountExists ? accountDelta : 0)
      );

      return {
        balances: nextBalances,
        available: nextAvailable,
        movements: [
          ...state.movements,
          {
            ...movement,
            balanceAfter,
            availableAfter,
            historical: !movement.createdAt,
          },
        ],
      };
    }, initialState);

  return result.movements;
}

export default function TransactionHistory() {
  const [data, setData] = useState({
    transactions: [],
    debtPayments: [],
    savingsMovements: [],
    accounts: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const result = await getFinancialData();

        if (active) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "No se pudo cargar el historial.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const {
    transactions = [],
    debtPayments = [],
    savingsMovements = [],
    accounts = [],
  } = data;

  const [filter, setFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [search, setSearch] = useState("");

  const movements = useMemo(
    () =>
      buildMovements({
        transactions,
        debtPayments,
        savingsMovements,
        accounts,
      }),
    [transactions, debtPayments, savingsMovements, accounts]
  );

  const filtered = movements.filter((movement) => {
    const matchesType =
      filter === "all" || movement.type === filter;

    const matchesAccount =
      accountFilter === "all" ||
      movement.accountId === accountFilter;

    const searchableText = [
      movement.description,
      movement.category,
      movement.accountName,
      movement.goalName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search.trim() ||
      searchableText.includes(search.trim().toLowerCase());

    return matchesType && matchesAccount && matchesSearch;
  });

  if (loading) {
    return (
      <section className="history-page">
        <p>Cargando historial desde Supabase...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="history-page">
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="history-page">
      <header className="history-heading">
        <h2>Historial</h2>
        <p>
          Consulta el origen de cada movimiento y los saldos
          disponibles después de realizarlo.
        </p>
      </header>

      <article className="history-panel">
        <div className="history-filters">
          <label>
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Descripción, categoría o cuenta"
            />
          </label>

          <label>
            Tipo
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todos</option>

              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cuenta
            <select
              value={accountFilter}
              onChange={(event) =>
                setAccountFilter(event.target.value)
              }
            >
              <option value="all">Todas</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </article>

      <article className="history-panel">
        <div className="history-panel-heading">
          <h3>Movimientos</h3>
          <span>{filtered.length} resultados</span>
        </div>

        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Movimiento</th>
                <th>Tipo</th>
                <th>Cuenta / Origen</th>
                <th>Importe</th>
                <th>Saldo de cuenta</th>
                <th>Saldo general disponible</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((movement) => {
                const isPositive =
                  movement.type === "income" ||
                  movement.type === "saving_return";

                const amount = isValidAmount(movement.amount)
                  ? Number(movement.amount)
                  : 0;

                return (
                  <tr key={movement.key}>
                    <td>{movement.date}</td>

                    <td>
                      {movement.description}
                      {movement.type === "saving_spend" &&
                        movement.category && (
                          <small
                            style={{
                              display: "block",
                              opacity: 0.7,
                            }}
                          >
                            Categoría: {movement.category}
                          </small>
                        )}
                    </td>

                    <td>
                      <span
                        className={`history-type ${movement.type}`}
                      >
                        {labels[movement.type] || movement.type}
                      </span>
                    </td>

                    <td>
                      {movement.accountName ||
                        movement.account ||
                        "Ahorro reservado"}
                    </td>

                    <td
                      className={
                        isPositive
                          ? "history-income"
                          : "history-expense"
                      }
                    >
                      {isPositive ? "+" : "−"}
                      {money(amount)}
                    </td>

                    <td>
                      {movement.balanceAfter == null
                        ? "—"
                        : money(movement.balanceAfter)}
                    </td>

                    <td>
                      {money(movement.availableAfter)}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="history-empty">
                    No se encontraron movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Los saldos históricos se reconstruyen a partir de
          los saldos actuales. Los movimientos antiguos sin
          fecha de registro, las modificaciones manuales y
          los movimientos faltantes pueden limitar su precisión.
          El saldo general disponible no incluye el dinero
          reservado en metas de ahorro.
        </p>
      </article>
    </section>
  );
}