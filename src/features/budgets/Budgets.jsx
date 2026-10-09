
import { useEffect, useState } from "react";
import { getFinancialData } from "../../services/financeDataService";
import {
  getBudgets,
  createBudget,
  removeBudget,
} from "../../services/budgetsService";
import "./Budgets.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(amount) || 0);

const isCurrentMonth = (date) => {
  if (typeof date !== "string") return false;

  const now = new Date();
  const [year, month] = date.split("-").map(Number);

  return (
    year === now.getFullYear() &&
    month === now.getMonth() + 1
  );
};

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [savingsMovements, setSavingsMovements] = useState([]);

  const [form, setForm] = useState({
    category: "",
    limit: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [financialData, budgetData] = await Promise.all([
          getFinancialData(),
          getBudgets(),
        ]);

        if (!active) return;

        setCategories(financialData.categories || []);
        setTransactions(financialData.transactions || []);
        setSavingsMovements(financialData.savingsMovements || []);
        setBudgets(budgetData);
      } catch (err) {
        if (active) {
          setError(
            err.message || "No se pudieron cargar los presupuestos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const expenseCategories = categories.filter(
    (category) =>
      category.type === "expense" && category.active
  );

  const currentExpenses = [
    ...transactions.filter(
      (transaction) =>
        transaction.type === "expense" &&
        isCurrentMonth(transaction.date)
    ),
    ...savingsMovements.filter(
      (movement) =>
        movement.type === "saving_spend" &&
        isCurrentMonth(movement.date)
    ),
  ];

  const budgetsWithSpent = budgets.map((budget) => {
    const spent = currentExpenses
      .filter(
        (movement) =>
          movement.category === budget.category
      )
      .reduce(
        (sum, movement) =>
          sum + Number(movement.amount || 0),
        0
      );

    return {
      ...budget,
      spent,
    };
  });

  const totalBudget = budgetsWithSpent.reduce(
    (sum, budget) => sum + Number(budget.limit || 0),
    0
  );

  const totalSpent = budgetsWithSpent.reduce(
    (sum, budget) => sum + budget.spent,
    0
  );

  const totalAvailable = totalBudget - totalSpent;

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || deletingId !== null) return;

    setError("");
    setMessage("");

    const limit = Number(form.limit);

    if (
      !form.category ||
      form.limit === "" ||
      !Number.isFinite(limit) ||
      limit <= 0
    ) {
      setError("Completa los datos del presupuesto correctamente.");
      return;
    }

    if (
      budgets.some(
        (budget) => budget.category === form.category
      )
    ) {
      setError("Ya existe un presupuesto para esta categoría.");
      return;
    }

    setSaving(true);

    try {
      await createBudget({
        category: form.category,
        limit,
      });

      const updatedBudgets = await getBudgets();

      setBudgets(updatedBudgets);
      setForm({
        category: "",
        limit: "",
      });

      setMessage("Presupuesto creado correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo crear el presupuesto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (saving || deletingId !== null) return;

    if (!window.confirm("¿Deseas eliminar este presupuesto?")) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingId(id);

    try {
      await removeBudget(id);

      const updatedBudgets = await getBudgets();
      setBudgets(updatedBudgets);

      setMessage("Presupuesto eliminado correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo eliminar el presupuesto.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <section className="budgets-page">
        <p>Cargando presupuestos desde Supabase...</p>
      </section>
    );
  }

  return (
    <section className="budgets-page">
      <header className="budgets-heading">
        <div>
          <h2>Presupuestos</h2>
          <p>
            Define límites mensuales y controla cuánto estás gastando.
          </p>
        </div>

        <span className="budgets-period">Este mes</span>
      </header>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "#15803d" }}>
          {message}
        </p>
      )}

      <div className="budgets-summary">
        <article className="budgets-summary-card">
          <span>Presupuesto total</span>
          <strong>{formatMoney(totalBudget)}</strong>
        </article>

        <article className="budgets-summary-card spent">
          <span>Gastado</span>
          <strong>{formatMoney(totalSpent)}</strong>
        </article>

        <article className="budgets-summary-card available">
          <span>Disponible</span>
          <strong>{formatMoney(totalAvailable)}</strong>
        </article>
      </div>

      <article className="budgets-panel">
        <h3>Nuevo presupuesto</h3>

        <form className="budgets-form" onSubmit={handleSubmit}>
          <label>
            Categoría
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              disabled={saving || deletingId !== null}
              required
            >
              <option value="">Seleccionar categoría</option>

              {expenseCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Límite mensual (S/)
            <input
              type="number"
              name="limit"
              min="0.01"
              step="0.01"
              value={form.limit}
              onChange={handleChange}
              placeholder="0.00"
              disabled={saving || deletingId !== null}
              required
            />
          </label>

          <button
            className="budgets-submit"
            type="submit"
            disabled={saving || deletingId !== null}
          >
            {saving ? "Guardando..." : "Crear presupuesto"}
          </button>
        </form>
      </article>

      <article className="budgets-panel">
        <div className="budgets-panel-heading">
          <h3>Presupuestos del mes</h3>
          <span>{budgets.length} registrados</span>
        </div>

        <div className="budgets-list">
          {budgetsWithSpent.length === 0 && (
            <p>Aún no tienes presupuestos registrados.</p>
          )}

          {budgetsWithSpent.map((budget) => {
            const percentage =
              budget.limit > 0
                ? (budget.spent / budget.limit) * 100
                : 0;

            const remaining = budget.limit - budget.spent;

            let status = "normal";

            if (percentage >= 100) status = "danger";
            else if (percentage >= 80) status = "warning";

            return (
              <article className="budget-item" key={budget.id}>
                <div className="budget-item-heading">
                  <div>
                    <h4>{budget.category}</h4>
                    <p>
                      {formatMoney(budget.spent)} de{" "}
                      {formatMoney(budget.limit)}
                    </p>
                  </div>

                  <strong className={`budget-percentage ${status}`}>
                    {Math.round(percentage)}%
                  </strong>
                </div>

                <div className="budget-progress">
                  <div
                    className={`budget-progress-bar ${status}`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(percentage, 100)
                      )}%`,
                    }}
                  />
                </div>

                <div className="budget-item-footer">
                  <span>
                    {remaining >= 0
                      ? `Disponible: ${formatMoney(remaining)}`
                      : `Excedido: ${formatMoney(
                          Math.abs(remaining)
                        )}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(budget.id)}
                    disabled={saving || deletingId !== null}
                  >
                    {deletingId === budget.id
                      ? "Eliminando..."
                      : "Eliminar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </article>
    </section>
  );
}
