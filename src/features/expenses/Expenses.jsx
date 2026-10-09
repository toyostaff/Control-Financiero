
import { useEffect, useRef, useState } from "react";

import { getAccounts } from "../../services/accountsService";
import { getCategories } from "../../services/categoriesService";
import {
  getTransactions,
  createTransaction,
} from "../../services/transactionsService";
import { supabase } from "../../lib/supabase";

import "./Expenses.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(amount) || 0);

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const emptyForm = () => ({
  description: "",
  amount: "",
  category: "",
  accountId: "",
  date: today(),
});

export default function Expenses() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [savingsMovements, setSavingsMovements] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const submittingRef = useRef(false);

  async function fetchExpenseData() {
    const [
      accountsResult,
      categoriesResult,
      transactionsResult,
      savingsResult,
    ] = await Promise.all([
      getAccounts(),
      getCategories(),
      getTransactions(),
      supabase
        .from("savings_movements")
        .select(
          "id, goal_name, type, amount, description, category, date, created_at"
        )
        .eq("type", "saving_spend")
        .order("date", { ascending: false }),
    ]);

    if (savingsResult.error) {
      throw new Error(savingsResult.error.message);
    }

    return {
      accounts: accountsResult,
      categories: categoriesResult,
      transactions: transactionsResult,
      savingsMovements: (savingsResult.data || []).map(
        (movement) => ({
          id: movement.id,
          goalName: movement.goal_name,
          type: movement.type,
          amount: Number(movement.amount),
          description: movement.description,
          category: movement.category,
          date: movement.date,
          createdAt: movement.created_at,
        })
      ),
    };
  }

  function applyExpenseData(data) {
    setAccounts(data.accounts);
    setCategories(data.categories);
    setTransactions(data.transactions);
    setSavingsMovements(data.savingsMovements);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const data = await fetchExpenseData();

        if (active) {
          applyExpenseData(data);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error.message || "No se pudieron cargar los gastos."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const normalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => ({
      ...transaction,
      movementKey: `expense-${transaction.id}`,
      source: "account",
      accountName:
        accounts.find(
          (account) => account.id === transaction.accountId
        )?.name || "Cuenta no disponible",
    }));

  const savingsExpenses = savingsMovements
    .filter((movement) => movement.type === "saving_spend")
    .map((movement) => ({
      ...movement,
      movementKey: `saving-${movement.id}`,
      source: "savings",
      description:
        movement.description ||
        `Gasto desde ahorro: ${movement.goalName}`,
      category: movement.category || "Otros",
      accountName: `Meta: ${movement.goalName || "Ahorro"}`,
    }));

  const expenses = [
    ...normalExpenses,
    ...savingsExpenses,
  ].sort(
    (a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")) ||
      String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      ) ||
      String(b.movementKey).localeCompare(
        String(a.movementKey)
      )
  );

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const normalTotal = normalExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const savingsTotal = savingsExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const availableCategories = categories.filter(
    (category) =>
      category.type === "expense" && category.active
  );

  const availableAccounts = accounts.filter(
    (account) => account.active
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current || loading) return;

    submittingRef.current = true;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createTransaction({
        description: form.description.trim(),
        amount: form.amount,
        category: form.category,
        accountId: form.accountId,
        date: form.date,
        type: "expense",
      });

      setForm(emptyForm());

      try {
        const updatedData = await fetchExpenseData();
        applyExpenseData(updatedData);

        setSuccessMessage(
          "Gasto registrado correctamente. El saldo de la cuenta se actualizó en Supabase."
        );
      } catch (refreshError) {
        console.error(
          "Error al actualizar los gastos:",
          refreshError
        );

        setErrorMessage(
          "El gasto se guardó en Supabase, pero no se pudo actualizar la pantalla. Recarga la página para consultar los datos."
        );
      }
    } catch (error) {
      setErrorMessage(
        error.message || "No se pudo registrar el gasto."
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="expenses-page">
      <header className="expenses-heading">
        <div>
          <h2>Mis gastos</h2>
          <p>
            Registra y organiza tus gastos normales
            y los realizados desde tus ahorros.
          </p>
        </div>
      </header>

      {errorMessage && (
        <p
          role="alert"
          style={{
            color: "#b91c1c",
            marginBottom: "16px",
          }}
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          style={{
            color: "#15803d",
            marginBottom: "16px",
          }}
        >
          {successMessage}
        </p>
      )}

      <div className="expenses-summary">
        <article className="expenses-summary-card">
          <span>Total registrado</span>
          <strong>{formatMoney(total)}</strong>
        </article>

        <article className="expenses-summary-card">
          <span>Número de movimientos</span>
          <strong>{expenses.length}</strong>
        </article>

        <article className="expenses-summary-card">
          <span>Gastos desde cuentas</span>
          <strong>{formatMoney(normalTotal)}</strong>
        </article>

        <article className="expenses-summary-card">
          <span>Gastos desde ahorros</span>
          <strong>{formatMoney(savingsTotal)}</strong>
        </article>
      </div>

      <article className="expenses-card">
        <h3>Registrar nuevo gasto</h3>

        {loading ? (
          <p>Cargando información desde Supabase...</p>
        ) : (
          <form
            className="expenses-form"
            onSubmit={handleSubmit}
          >
            <label>
              Descripción
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ej. Compra de alimentos"
                disabled={saving}
                required
              />
            </label>

            <label>
              Importe (S/)
              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                disabled={saving}
                required
              />
            </label>

            <label>
              Categoría
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                disabled={saving}
                required
              >
                <option value="">
                  Seleccionar categoría
                </option>

                {availableCategories.map((category) => (
                  <option
                    key={category.id}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cuenta
              <select
                name="accountId"
                value={form.accountId}
                onChange={handleChange}
                disabled={saving}
                required
              >
                <option value="">
                  Seleccionar cuenta
                </option>

                {availableAccounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name} —{" "}
                    {formatMoney(account.balance)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                disabled={saving}
                required
              />
            </label>

            <button
              className="expenses-submit"
              type="submit"
              disabled={
                saving ||
                availableAccounts.length === 0 ||
                availableCategories.length === 0
              }
            >
              {saving
                ? "Guardando gasto..."
                : "Guardar gasto"}
            </button>

            {availableAccounts.length === 0 && (
              <p>
                Primero debes crear una cuenta activa
                en el módulo Cuentas.
              </p>
            )}

            {availableCategories.length === 0 && (
              <p>
                No tienes categorías de gasto activas.
                Crea una en el módulo Categorías.
              </p>
            )}
          </form>
        )}
      </article>

      <article className="expenses-card">
        <h3>Historial de gastos</h3>

        <div className="expenses-table-wrapper">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta / Origen</th>
                <th>Importe</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.movementKey}>
                  <td>{expense.date}</td>

                  <td>
                    {expense.description}

                    {expense.source === "savings" && (
                      <small
                        style={{
                          display: "block",
                          opacity: 0.7,
                          marginTop: 4,
                        }}
                      >
                        Gasto desde ahorro
                      </small>
                    )}
                  </td>

                  <td>{expense.category}</td>

                  <td>{expense.accountName}</td>

                  <td className="expenses-amount">
                    {formatMoney(expense.amount)}
                  </td>

                  <td>
                    {expense.source === "account" ? (
                      <button
                        type="button"
                        className="expenses-delete"
                        disabled
                        title="Disponible cuando implementemos la reversión segura del saldo en Supabase."
                      >
                        Eliminar
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                        }}
                        title="Movimiento registrado desde una meta de ahorro"
                      >
                        Desde ahorro
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && expenses.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="expenses-empty"
                  >
                    No tienes gastos registrados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="expenses-empty"
                  >
                    Cargando gastos...
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
