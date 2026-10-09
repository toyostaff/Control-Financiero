
import { useEffect, useRef, useState } from "react";

import { getAccounts } from "../../services/accountsService";
import {
  getTransactions,
  createTransaction,
} from "../../services/transactionsService";

import { supabase } from "../../lib/supabase";

import "./Income.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(amount) || 0);

const today = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyForm = () => ({
  description: "",
  amount: "",
  category: "",
  accountId: "",
  date: today(),
});

export default function Income() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const submittingRef = useRef(false);

  async function loadIncomeData() {
    const [
      accountsResult,
      transactionsResult,
      categoriesResult,
    ] = await Promise.all([
      getAccounts(),
      getTransactions(),
      supabase
        .from("categories")
        .select("id, name, type, active")
        .eq("type", "income")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

    if (categoriesResult.error) {
      throw new Error(categoriesResult.error.message);
    }

    setAccounts(accountsResult);
    setTransactions(transactionsResult);
    setCategories(categoriesResult.data || []);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [
          accountsResult,
          transactionsResult,
          categoriesResult,
        ] = await Promise.all([
          getAccounts(),
          getTransactions(),
          supabase
            .from("categories")
            .select("id, name, type, active")
            .eq("type", "income")
            .eq("active", true)
            .order("name", { ascending: true }),
        ]);

        if (categoriesResult.error) {
          throw new Error(categoriesResult.error.message);
        }

        if (!active) return;

        setAccounts(accountsResult);
        setTransactions(transactionsResult);
        setCategories(categoriesResult.data || []);
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          error.message || "No se pudieron cargar los ingresos."
        );
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

  const income = transactions.filter(
    (transaction) => transaction.type === "income"
  );

  const availableAccounts = accounts.filter(
    (account) => account.active
  );

  const availableCategories = categories.filter(
    (category) =>
      category.type === "income" && category.active
  );

  const total = income.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
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
        type: "income",
      });

      setForm(emptyForm());

      try {
        await loadIncomeData();
        setSuccessMessage(
          "Ingreso registrado correctamente. El saldo de la cuenta se actualizó en Supabase."
        );
      } catch (refreshError) {
        setErrorMessage(
          "El ingreso se guardó en Supabase, pero no se pudo actualizar la pantalla. Recarga la página para consultar los datos."
        );

        console.error(
          "Error al actualizar ingresos:",
          refreshError
        );
      }
    } catch (error) {
      setErrorMessage(
        error.message || "No se pudo registrar el ingreso."
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="income-page">
      <header className="income-heading">
        <div>
          <h2>Mis ingresos</h2>
          <p>Registra y controla el dinero que recibes.</p>
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

      <div className="income-summary">
        <article className="income-summary-card">
          <span>Total registrado</span>
          <strong>{formatMoney(total)}</strong>
        </article>

        <article className="income-summary-card">
          <span>Número de movimientos</span>
          <strong>{income.length}</strong>
        </article>
      </div>

      <article className="income-card">
        <h3>Registrar nuevo ingreso</h3>

        {loading ? (
          <p>Cargando información desde Supabase...</p>
        ) : (
          <form
            className="income-form"
            onSubmit={handleSubmit}
          >
            <label>
              Descripción
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ej. Sueldo mensual"
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
              Cuenta de destino
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
              className="income-submit"
              type="submit"
              disabled={
                saving ||
                availableAccounts.length === 0 ||
                availableCategories.length === 0
              }
            >
              {saving
                ? "Guardando ingreso..."
                : "Guardar ingreso"}
            </button>

            {availableAccounts.length === 0 && (
              <p>
                Primero debes crear una cuenta activa
                en el módulo Cuentas.
              </p>
            )}

            {availableCategories.length === 0 && (
              <p>
                No tienes categorías de ingreso activas
                en Supabase. Debemos configurar las
                categorías antes de registrar ingresos.
              </p>
            )}
          </form>
        )}
      </article>

      <article className="income-card">
        <h3>Historial de ingresos</h3>

        <div className="income-table-wrapper">
          <table className="income-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Importe</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {income.map((item) => {
                const account = accounts.find(
                  (entry) => entry.id === item.accountId
                );

                return (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.description}</td>
                    <td>{item.category}</td>
                    <td>
                      {account?.name || "Cuenta no disponible"}
                    </td>
                    <td className="income-amount">
                      {formatMoney(item.amount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="income-delete"
                        disabled
                        title="Disponible cuando implementemos la reversión segura del saldo en Supabase."
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && income.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="income-empty"
                  >
                    No tienes ingresos registrados.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="income-empty"
                  >
                    Cargando ingresos...
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
