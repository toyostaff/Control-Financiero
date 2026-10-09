import { useEffect, useState } from "react";
import { getFinancialData } from "../../services/financeDataService";
import "./Dashboard.css";
import FinancialCharts from "./FinancialCharts";

const money = (value) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value) || 0);

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const isInMonth = (date, year, month) => {
  if (typeof date !== "string") return false;

  const [movementYear, movementMonth] = date
    .split("-")
    .map(Number);

  return movementYear === year && movementMonth === month + 1;
};

export default function Dashboard() {
  const [financialData, setFinancialData] = useState({
    accounts: [],
    transactions: [],
    goals: [],
    debtPayments: [],
    savingsMovements: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const result = await getFinancialData();

        if (active) {
          setFinancialData(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "No se pudo cargar el Dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const {
    accounts,
    transactions,
    goals,
    debtPayments,
    savingsMovements,
  } = financialData;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const available = accounts
    .filter((account) => account.active)
    .reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0
    );

  const reserved = goals.reduce(
    (sum, goal) => sum + Number(goal.saved || 0),
    0
  );

  // Solo las compras realizadas con ahorros son gastos.
  // Los aportes y devoluciones son transferencias internas.
  const savingExpenses = savingsMovements
    .filter((movement) => movement.type === "saving_spend")
    .map((movement) => ({
      ...movement,
      type: "expense",
      sourceType: "saving_spend",
      category: movement.category || "Otros",
      description:
        movement.description ||
        `Gasto desde ahorro: ${movement.goalName}`,
      accountName: `Meta: ${movement.goalName}`,
    }));

  // Conjunto de operaciones que afectan ingresos y gastos.
  // No incluye aportes, devoluciones ni pagos de deuda.
  const financialOperations = [
    ...transactions,
    ...savingExpenses,
  ];

  const current = financialOperations.filter((movement) =>
    isInMonth(movement.date, year, month)
  );

  const income = current
    .filter((movement) => movement.type === "income")
    .reduce(
      (sum, movement) => sum + Number(movement.amount || 0),
      0
    );

  const expenses = current
    .filter((movement) => movement.type === "expense")
    .reduce(
      (sum, movement) => sum + Number(movement.amount || 0),
      0
    );

  const savingExpensesThisMonth = savingExpenses
    .filter((movement) =>
      isInMonth(movement.date, year, month)
    )
    .reduce(
      (sum, movement) => sum + Number(movement.amount || 0),
      0
    );

  const indicators = [
    {
      title: "Dinero disponible",
      value: money(available),
      description: "Disponible en cuentas activas",
      type: "balance",
    },
    {
      title: "Ahorro reservado",
      value: money(reserved),
      description: "Dinero apartado para tus metas",
      type: "savings",
    },
    {
      title: "Dinero total",
      value: money(available + reserved),
      description: "Disponible más ahorro reservado",
      type: "balance",
    },
    {
      title: "Ingresos del mes",
      value: money(income),
      description: "Ingresos registrados este mes",
      type: "income",
    },
    {
      title: "Gastos del mes",
      value: money(expenses),
      description:
        savingExpensesThisMonth > 0
          ? `Incluye ${money(savingExpensesThisMonth)} gastados desde ahorros`
          : "Gastos registrados este mes",
      type: "expense",
    },
    {
      title: "Ingresos menos gastos",
      value: money(income - expenses),
      description:
        "No incluye aportes a metas ni pagos de deudas",
      type: "savings",
    },
  ];

  // Gráfico mensual: incluye gastos desde ahorros.
  const monthlyData = months.map((label, index) => {
    const list = financialOperations.filter((movement) =>
      isInMonth(movement.date, year, index)
    );

    return {
      month: label,
      ingresos: list
        .filter((movement) => movement.type === "income")
        .reduce(
          (sum, movement) =>
            sum + Number(movement.amount || 0),
          0
        ),
      gastos: list
        .filter((movement) => movement.type === "expense")
        .reduce(
          (sum, movement) =>
            sum + Number(movement.amount || 0),
          0
        ),
    };
  });

  // Gráfico por categorías: también incluye compras con ahorros.
  const categoryTotals = current
    .filter((movement) => movement.type === "expense")
    .reduce((totals, movement) => {
      const category = movement.category || "Otros";

      return {
        ...totals,
        [category]:
          (totals[category] || 0) +
          Number(movement.amount || 0),
      };
    }, {});

  const categoryData = Object.entries(categoryTotals).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  // Historial reciente: conserva los tipos reales de movimiento.
  const recent = [
    ...transactions.map((transaction) => ({
      ...transaction,
      key: `t-${transaction.id}`,
      accountName: transaction.account || "",
    })),

    ...debtPayments.map((payment) => ({
      ...payment,
      key: `d-${payment.id}`,
      description: `Pago de deuda: ${payment.debtName}`,
      type: "debt_payment",
      accountName: payment.accountName || "",
    })),

    ...savingsMovements.map((movement) => ({
      ...movement,
      key: `s-${movement.id}`,
      description:
        movement.type === "saving_spend"
          ? movement.description ||
            `Gasto desde ahorro: ${movement.goalName}`
          : movement.type === "saving_contribution"
            ? `Aporte a meta: ${movement.goalName}`
            : `Retiro de ahorro: ${movement.goalName}`,
      accountName:
        movement.type === "saving_spend"
          ? `Meta: ${movement.goalName}`
          : movement.accountName || "Ahorro reservado",
    })),
  ]
    .sort(
      (a, b) =>
        String(b.date || "").localeCompare(
          String(a.date || "")
        ) ||
        String(b.createdAt || "").localeCompare(
          String(a.createdAt || "")
        ) ||
        String(b.key).localeCompare(String(a.key))
    )
    .slice(0, 5);

  const isPositiveMovement = (movement) =>
    movement.type === "income" ||
    movement.type === "saving_return";

  if (loading) {
    return (
      <section className="dashboard">
        <p>Cargando información financiera desde Supabase...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard">
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h2>Resumen financiero</h2>
          <p>
            Consulta el dinero disponible, reservado y tus
            movimientos.
          </p>
        </div>

        <span className="dashboard-period">
          Este mes
        </span>
      </div>

      <div className="indicator-grid">
        {indicators.map((indicator) => (
          <article
            className={`indicator-card indicator-${indicator.type}`}
            key={indicator.title}
          >
            <p className="indicator-title">
              {indicator.title}
            </p>

            <h3>{indicator.value}</h3>

            <p className="indicator-description">
              {indicator.description}
            </p>
          </article>
        ))}
      </div>

      <FinancialCharts
        monthlyData={monthlyData}
        categoryData={categoryData}
      />

      <article className="dashboard-panel">
        <h3>Últimos movimientos</h3>

        {recent.length === 0 ? (
          <div className="dashboard-empty">
            Aún no tienes movimientos registrados.
          </div>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta / Origen</th>
                  <th>Importe</th>
                </tr>
              </thead>

              <tbody>
                {recent.map((movement) => {
                  const positive =
                    isPositiveMovement(movement);

                  return (
                    <tr key={movement.key}>
                      <td>{movement.date}</td>

                      <td>
                        {movement.description}
                        {movement.type === "saving_spend" && (
                          <small
                            style={{
                              display: "block",
                              opacity: 0.7,
                            }}
                          >
                            Gasto desde ahorro
                            {movement.category
                              ? ` · ${movement.category}`
                              : ""}
                          </small>
                        )}
                      </td>

                      <td>
                        {movement.accountName ||
                          movement.account ||
                          "Ahorro reservado"}
                      </td>

                      <td
                        className={
                          positive
                            ? "history-income"
                            : "history-expense"
                        }
                      >
                        {positive ? "+" : "−"}
                        {money(movement.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}