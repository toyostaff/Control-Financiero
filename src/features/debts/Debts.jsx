import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { getFinancialData } from "../../services/financeDataService";
import {
  getDebts,
  getDebtPayments,
  createDebt,
  registerDebtPayment,
  completeDebtEarly,
  registerTestDebtPayment,
  reverseDebtPayment,
  deleteDebtSafely,
  deleteTestDebt,
  initializeDebtTestAccounts,
  getDebtTestAccounts,
  resetDebtTestEnvironment,
} from "../../services/debtsService";
import "./Debts.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(amount) || 0);

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const debtTypes = {
  university: "Universidad",
  bank: "Banco",
  personal: "Personal",
  other: "Otra deuda",
};
const pieColors = [
  "#287d68",
  "#548fe0",
  "#e6a54b",
  "#9571d5",
  "#cf6f8b",
  "#6a9b9e",
];
const emptyDebtForm = () => ({
  name: "",
  type: "university",
  amount: "",
  monthlyPayment: "",
  dueDay: "5",
  singlePayment: false,
});
const emptyPaymentForm = () => ({
  debtId: "",
  accountId: "",
  amount: "",
  date: localToday(),
});

export default function Debts() {
  const [debtMode, setDebtMode] = useState("real");
  const [debtAccounts, setDebtAccounts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [debtPayments, setDebtPayments] = useState([]);
  const [form, setForm] = useState(emptyDebtForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [selectedDebtId, setSelectedDebtId] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const operationLock = useRef(false);

  async function fetchModeData(mode) {
    const financial = await getFinancialData();
    const [loadedDebts, loadedPayments] = await Promise.all([
      getDebts(mode),
      getDebtPayments(mode),
    ]);
    let accounts = financial.accounts || [];
    if (mode === "test") {
      await initializeDebtTestAccounts();
      const simulated = await getDebtTestAccounts();
      const balances = new Map(
        simulated.map((item) => [item.accountId, item.balance]),
      );
      accounts = accounts.map((account) => ({
        ...account,
        balance: balances.get(account.id) ?? 0,
      }));
    }
    return { accounts, debts: loadedDebts, payments: loadedPayments };
  }

  function applyModeData(data) {
    setDebtAccounts(data.accounts);
    setDebts(data.debts);
    setDebtPayments(data.payments);
  }

  useEffect(() => {
    let active = true;
    fetchModeData("real")
      .then((data) => {
        if (active) applyModeData(data);
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Error al cargar deudas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runAction(operation, successMessage) {
    if (operationLock.current || loading) return false;
    operationLock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(error.message || "No se pudo completar la operación.");
      operationLock.current = false;
      setBusy(false);
      return false;
    }
    // La operación ya se confirmó en la BD: no repetirla si falla la recarga.
    try {
      applyModeData(await fetchModeData(debtMode));
      setMessage(successMessage);
    } catch (error) {
      setMessage(
        `${successMessage} No se pudieron actualizar los datos: ${error.message}`,
      );
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
    return true;
  }

  async function changeDebtMode(nextMode) {
    if (operationLock.current || loading || nextMode === debtMode) return;
    operationLock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const data = await fetchModeData(nextMode);
      applyModeData(data);
      setDebtMode(nextMode);
      setSelectedDebtId("all");
      setPaymentForm(emptyPaymentForm());
    } catch (error) {
      setMessage(error.message || "No se pudo cambiar de modo.");
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  }

  const activeAccounts = debtAccounts.filter((account) => account.active);
  const totalDebt = debts.reduce(
    (sum, debt) =>
      sum + (debt.closedAt ? 0 : Number(debt.balance)),
    0
  );
  const totalPaid = debtPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );
  const monthlyTotal = debts.reduce(
    (sum, debt) =>
      sum +
      (!debt.closedAt && Number(debt.balance) > 0
        ? Math.min(Number(debt.monthlyPayment), Number(debt.balance))
        : 0),
    0,
  );

  const sortedPayments = useMemo(
    () =>
      [...debtPayments].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      ),
    [debtPayments],
  );

  const chartData = useMemo(() => {
    const shown =
      selectedDebtId === "all"
        ? debts
        : debts.filter((debt) => debt.id === selectedDebtId);
    const shownIds = new Set(shown.map((debt) => debt.id));
    const initial = shown.reduce(
      (sum, debt) => sum + Number(debt.initialAmount),
      0,
    );
    const payments = debtPayments
      .filter((payment) => shownIds.has(payment.debtId))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
      );
const initialPoint = {
  label: "Inicial",
  balance: Number(initial.toFixed(2)),
};

const paymentPoints = payments.reduce(
  (acc, payment, index) => {
    const principal = Number.isFinite(Number(payment.principal))
      ? Number(payment.principal)
      : Number(payment.amount) - Number(payment.interest || 0);

    const previousBalance =
      index === 0 ? initial : acc[index - 1].balance;

    const nextBalance = Math.max(
      0,
      previousBalance - principal
    );

    return [
      ...acc,
      {
        label: `${payment.date} #${index + 1}`,
        balance: Number(nextBalance.toFixed(2)),
      },
    ];
  },
  []
);

const closureEvents = shown
  .filter((debt) => debt.closedAt)
  .map((debt) => ({
    date: debt.closedAt,
    amount: Number(debt.forgivenAmount || 0),
  }));

const events = [
  ...payments.map((payment) => ({
    date: `${payment.date}T00:00:00`,
    amount: Number(payment.principal ?? payment.amount),
    label: payment.date,
    type: "payment",
  })),
  ...closureEvents.map((event) => ({
    ...event,
    label: "Cierre anticipado",
    type: "closure",
  })),
].sort((a, b) => a.date.localeCompare(b.date));

let remaining = initial;

const points = events.map((event, index) => {
  remaining = Math.max(0, remaining - event.amount);

  return {
    label:
      event.type === "closure"
        ? `Cierre #${index + 1}`
        : `${event.label} #${index + 1}`,
    balance: Number(remaining.toFixed(2)),
  };
});

return [initialPoint, ...points];

  }, 
  
  [debts, debtPayments, selectedDebtId]);

  const monthlyData = useMemo(() => {
    const months = new Map();
    debtPayments.forEach((payment) => {
      const month = payment.date.slice(0, 7);
      months.set(month, (months.get(month) || 0) + Number(payment.amount));
    });
    return [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount: Number(amount.toFixed(2)) }));
  }, [debtPayments]);

  const distributionData = useMemo(() => {
    const amounts = new Map();
    debts.forEach((debt) => {
      if (debt.closedAt || Number(debt.balance) <= 0) return;
      const type = debtTypes[debt.type] || "Otra deuda";
      amounts.set(type, (amounts.get(type) || 0) + Number(debt.balance));
    });
    return [...amounts.entries()].map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }, [debts]);

  async function registerDebt(event) {
    event.preventDefault();
    const ok = await runAction(
      () => createDebt(form, debtMode),
      "Deuda registrada correctamente.",
    );
    if (ok) setForm(emptyDebtForm());
  }

  async function registerPayment(event) {
    event.preventDefault();
    const operation =
      debtMode === "real"
        ? () => registerDebtPayment(paymentForm, "real")
        : () => registerTestDebtPayment(paymentForm);
    const ok = await runAction(
      operation,
      debtMode === "real"
        ? "Pago real registrado correctamente."
        : "Pago simulado registrado correctamente.",
    );
    if (ok) setPaymentForm(emptyPaymentForm());
  }

  async function removePayment(payment) {
    if (operationLock.current) return;
    if (
      !window.confirm(
        `¿Revertir el pago de ${formatMoney(payment.amount)} del ${payment.date}? Se restaurarán los saldos correspondientes.`,
      )
    )
      return;
    await runAction(
      () => reverseDebtPayment(payment.id, debtMode),
      "Pago revertido y saldos restaurados.",
    );
  }

  async function closeDebtEarly(debt) {
    if (operationLock.current || busy || debt.closedAt) return;

    const paid = Number(debt.initialAmount) - Number(debt.balance);
    const progress = (paid / Number(debt.initialAmount)) * 100;

    if (
      !Number.isFinite(progress) ||
      progress < 90 ||
      Number(debt.balance) <= 0
    ) {
      setMessage("La deuda debe tener al menos el 90% amortizado.");
      return;
    }

    const confirmed = window.confirm(
      `¿Marcar «${debt.name}» como completada?\n\n` +
      `Importe amortizado: ${formatMoney(paid)}\n` +
      `Importe condonado: ${formatMoney(debt.balance)}\n\n` +
      "Esta acción cerrará la deuda sin registrar otro pago."
    );

    if (!confirmed) return;

    await runAction(
      () => completeDebtEarly(debt.id),
      "Deuda marcada como completada correctamente."
    );
  }

  async function removeDebt(debt) {
    if (operationLock.current) return;
    const count = debtPayments.filter(
      (payment) => payment.debtId === debt.id,
    ).length;
    if (debtMode === "real" && count > 0) {
      setMessage(
        "Esta deuda real tiene pagos registrados. Por seguridad, no puede eliminarse directamente.",
      );
      return;
    }
    const prompt =
      debtMode === "test"
        ? `¿Eliminar la deuda simulada «${debt.name}» y sus ${count} pago(s)? Se restaurarán los saldos simulados.`
        : `¿Eliminar la deuda real «${debt.name}»?`;
    if (!window.confirm(prompt)) return;
    const ok = await runAction(
      () =>
        debtMode === "real"
          ? deleteDebtSafely(debt.id)
          : deleteTestDebt(debt.id),
      "Deuda eliminada correctamente.",
    );
    if (ok && selectedDebtId === debt.id) setSelectedDebtId("all");
  }

  async function resetSimulation() {
    if (operationLock.current || debtMode !== "test") return;
    if (
      !window.confirm(
        "¿Reiniciar TODAS las deudas, pagos y saldos simulados? Esta acción es irreversible y no afecta tus datos reales.",
      )
    )
      return;
    const ok = await runAction(
      resetDebtTestEnvironment,
      "Datos de prueba reiniciados.",
    );
    if (ok) {
      setSelectedDebtId("all");
      setPaymentForm(emptyPaymentForm());
    }
  }

  if (loading)
    return (
      <section className="debts-page">
        <p>Cargando deudas desde Supabase...</p>
      </section>
    );
  if (loadError)
    return (
      <section className="debts-page">
        <p role="alert">{loadError}</p>
      </section>
    );

  return (
    <section className="debts-page">
      <header className="debts-heading">
        <div>
          <h2>Deudas y préstamos</h2>
          <p>Registra lo que debes, controla tus pagos y revisa tu avance.</p>
        </div>
        <div className="debts-mode">
          <label htmlFor="debt-mode">Entorno</label>
          <select
            id="debt-mode"
            value={debtMode}
            disabled={busy}
            onChange={(event) => changeDebtMode(event.target.value)}
          >
            <option value="real">Modo real</option>
            <option value="test">Modo de pruebas</option>
          </select>
          {debtMode === "test" && (
            <button type="button" disabled={busy} onClick={resetSimulation}>
              Reiniciar pruebas
            </button>
          )}
        </div>
      </header>

      <p className={`debts-mode-note ${debtMode === "test" ? "is-test" : ""}`}>
        {debtMode === "test"
          ? "Simulación: usa una copia independiente de tus cuentas. Los pagos no modifican tus saldos reales ni aparecen en el Historial general."
          : "Modo real: los pagos modifican los saldos de tus cuentas y aparecen en el Historial general."}
      </p>
      {message && (
        <p className="debts-feedback" role="status">
          {message}
        </p>
      )}

      <div className="debts-summary">
        <article className="debts-summary-card">
          <span>Deuda pendiente</span>
          <strong>{formatMoney(totalDebt)}</strong>
        </article>
        <article className="debts-summary-card">
          <span>Pagos registrados</span>
          <strong>{formatMoney(totalPaid)}</strong>
        </article>
        <article className="debts-summary-card">
          <span>Cuotas previstas</span>
          <strong>{formatMoney(monthlyTotal)}</strong>
        </article>
      </div>

      <div className="debts-forms-grid">
        <article className="debts-panel">
          <h3>Registrar deuda</h3>
          <form className="debts-form" onSubmit={registerDebt}>
            <label>
              Nombre
              <input
                required
                placeholder="Ej. Universidad"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
              >
                {Object.entries(debtTypes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Saldo total pendiente (S/)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
              />
            </label>
            <label className="debts-checkbox">
              <input
                type="checkbox"
                checked={form.singlePayment}
                onChange={(event) =>
                  setForm({ ...form, singlePayment: event.target.checked })
                }
              />{" "}
              Se paga en una sola cuota
            </label>
            {!form.singlePayment && (
              <label>
                Cuota habitual (S/)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.monthlyPayment}
                  onChange={(event) =>
                    setForm({ ...form, monthlyPayment: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              Día de vencimiento
              <input
                required
                type="number"
                min="1"
                max="31"
                value={form.dueDay}
                onChange={(event) =>
                  setForm({ ...form, dueDay: event.target.value })
                }
              />
            </label>
            <button className="debts-submit" type="submit" disabled={busy}>
              Registrar deuda
            </button>
          </form>
        </article>

        <article className="debts-panel">
          <h3>Registrar pago</h3>
          <form className="debts-form" onSubmit={registerPayment}>
            <label>
              Deuda
              <select
                required
                value={paymentForm.debtId}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, debtId: event.target.value })
                }
              >
                <option value="">Seleccionar deuda</option>
                {debts
                  .filter((debt) => !debt.closedAt && debt.balance > 0)
                  .map((debt) => (
                    <option key={debt.id} value={debt.id}>
                      {debt.name} — {formatMoney(debt.balance)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Cuenta de pago
              <select
                required
                value={paymentForm.accountId}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    accountId: event.target.value,
                  })
                }
              >
                <option value="">Seleccionar cuenta</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {formatMoney(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ¿Cuánto pagaste? (S/)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, amount: event.target.value })
                }
              />
            </label>
            <label>
              Fecha de pago
              <input
                required
                type="date"
                value={paymentForm.date}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, date: event.target.value })
                }
              />
            </label>
            <button className="debts-submit" type="submit" disabled={busy}>
              Registrar pago
            </button>
          </form>
        </article>
      </div>

      <div className="debts-grid">
        {debts.map((debt) => {
          const progress =
            debt.initialAmount > 0
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    ((Number(debt.initialAmount) - Number(debt.balance)) /
                      Number(debt.initialAmount)) *
                      100,
                  ),
                )
              : 0;
          return (
            <article className="debt-card" key={debt.id}>
              <div className="debt-card-header">
                <h3>{debt.name}</h3>
                <span>{debtTypes[debt.type] || "Otra deuda"}</span>
              </div>
              <span
                className={`debt-status ${debt.balance <= 0 || debt.closedAt ? "paid" : ""}`}
              >
                {debt.closedAt
                  ? "Completada anticipadamente"
                  : debt.balance <= 0
                    ? "Pagada"
                    : "Pendiente"}
              </span>
              <div className="debt-amount">
                <span>Saldo pendiente</span>
                <strong>
                  {formatMoney(debt.closedAt ? 0 : debt.balance)}
                </strong>
              </div>
              <div className="debt-progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              <p>{progress.toFixed(0)}% pagado</p>
              <div className="debt-details">
                <span>
                  {debt.singlePayment
                    ? "Pago único"
                    : `Cuota: ${formatMoney(debt.monthlyPayment)}`}
                </span>
                <span>Vence el día {debt.dueDay}</span>
              </div>
              {debt.closedAt && (
                <p>
                  Descuento por cierre: {formatMoney(debt.forgivenAmount)}
                </p>
              )}
              <div className="debt-actions">
                {!debt.closedAt &&
                  debt.balance > 0 &&
                  debt.initialAmount > 0 &&
                  debt.balance <= debt.initialAmount * 0.10 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => closeDebtEarly(debt)}
                    >
                      Marcar como completada
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setSelectedDebtId(debt.id)}
                >
                  Ver evolución
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeDebt(debt)}
                >
                  Eliminar deuda
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {debts.length === 0 && (
        <p className="debts-empty">
          Todavía no tienes deudas registradas en este modo.
        </p>
      )}

      <div className="debts-charts-grid">
        <article className="debts-panel debts-chart-panel">
          <div className="debts-chart-heading">
            <h3>Evolución de deuda pendiente</h3>
            <select
              aria-label="Deuda del gráfico"
              value={selectedDebtId}
              onChange={(event) => setSelectedDebtId(event.target.value)}
            >
              <option value="all">Todas las deudas</option>
              {debts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.name}
                </option>
              ))}
            </select>
          </div>
          {debts.length ? (
            <div className="debts-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: 10, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" hide={chartData.length > 8} />
                  <YAxis width={72} />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                  <Line
                    type="stepAfter"
                    dataKey="balance"
                    name="Saldo pendiente"
                    stroke="#287d68"
                    strokeWidth={3}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="debts-empty">
              Registra una deuda para ver su evolución.
            </p>
          )}
        </article>

        <article className="debts-panel debts-chart-panel">
          <h3>Pagos realizados por mes</h3>
          {monthlyData.length ? (
            <div className="debts-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 16, left: 10, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis width={72} />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                  <Bar
                    dataKey="amount"
                    name="Pagos"
                    fill="#548fe0"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="debts-empty">
              Los pagos aparecerán aquí agrupados por mes.
            </p>
          )}
        </article>

        <article className="debts-panel debts-chart-panel">
          <h3>Distribución de deudas pendientes</h3>
          {distributionData.length ? (
            <div className="debts-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    outerRadius={95}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="debts-empty">
              No hay saldos pendientes para distribuir.
            </p>
          )}
        </article>
      </div>

      <article className="debts-panel">
        <div className="debts-chart-heading">
          <h3>Historial de pagos de deudas</h3>
          <span>{sortedPayments.length} pago(s)</span>
        </div>
        <div className="debts-table-wrapper">
          <table className="debts-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Deuda</th>
                <th>Cuenta</th>
                <th>Importe</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date}</td>
                  <td>{payment.debtName}</td>
                  <td>{payment.accountName}</td>
                  <td>{formatMoney(payment.amount)}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removePayment(payment)}
                    >
                      Eliminar pago
                    </button>
                  </td>
                </tr>
              ))}
              {!sortedPayments.length && (
                <tr>
                  <td colSpan="5" className="debts-empty">
                    Aún no hay pagos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
