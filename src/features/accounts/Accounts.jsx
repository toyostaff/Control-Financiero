
import { useEffect, useState } from "react";
import {
  getAccounts,
  createAccount,
  setAccountActive,
  removeAccount,
} from "../../services/accountsService";

import "./Accounts.css";

const accountTypes = [
  "Efectivo",
  "Cuenta bancaria",
  "Billetera digital",
  "Cuenta de ahorro",
];

const initialForm = {
  name: "",
  type: "",
  balance: "",
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(amount) || 0);

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      try {
        const result = await getAccounts();

        if (active) {
          setAccounts(result);
          setErrorMessage("");
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error.message || "No se pudieron cargar las cuentas."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      active = false;
    };
  }, []);

  const activeAccounts = accounts.filter(
    (account) => account.active
  );

  const totalBalance = activeAccounts.reduce(
    (sum, account) => sum + Number(account.balance),
    0
  );

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || busyAccountId !== null) return;

    clearMessages();

    const balance = Number(form.balance);

    if (
      !form.name.trim() ||
      !accountTypes.includes(form.type) ||
      form.balance.trim() === "" ||
      !Number.isFinite(balance) ||
      balance < 0 ||
      Math.abs(balance * 100 - Math.round(balance * 100)) >
        0.00001
    ) {
      setErrorMessage(
        "Completa los datos correctamente. El saldo no puede ser negativo."
      );
      return;
    }

    setSaving(true);

    try {
      const newAccount = await createAccount({
        name: form.name.trim(),
        type: form.type,
        balance,
      });

      setAccounts((previous) => [
        ...previous,
        newAccount,
      ]);

      setForm(initialForm);
      setSuccessMessage("Cuenta creada correctamente en Supabase.");
    } catch (error) {
      setErrorMessage(
        error.message || "No se pudo crear la cuenta."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(account) {
    if (saving || busyAccountId !== null) return;

    clearMessages();
    setBusyAccountId(account.id);

    try {
      const updatedAccount = await setAccountActive(
        account.id,
        !account.active
      );

      setAccounts((previous) =>
        previous.map((item) =>
          item.id === account.id ? updatedAccount : item
        )
      );

      setSuccessMessage(
        updatedAccount.active
          ? "Cuenta activada correctamente."
          : "Cuenta desactivada correctamente."
      );
    } catch (error) {
      setErrorMessage(
        error.message || "No se pudo actualizar la cuenta."
      );
    } finally {
      setBusyAccountId(null);
    }
  }

  async function handleDelete(account) {
    if (saving || busyAccountId !== null) return;

    const confirmed = window.confirm(
      `¿Deseas eliminar la cuenta "${account.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    clearMessages();
    setBusyAccountId(account.id);

    try {
      await removeAccount(account.id);

      setAccounts((previous) =>
        previous.filter((item) => item.id !== account.id)
      );

      setSuccessMessage("Cuenta eliminada correctamente.");
    } catch (error) {
      setErrorMessage(
        "No se pudo eliminar la cuenta. Si tiene movimientos asociados, desactívala en lugar de eliminarla. Detalle: " +
          (error.message || "Error desconocido.")
      );
    } finally {
      setBusyAccountId(null);
    }
  }

  return (
    <section className="accounts-page">
      <header className="accounts-heading">
        <div>
          <h2>Mis cuentas</h2>
          <p>Administra dónde guardas y manejas tu dinero.</p>
        </div>
      </header>

      {errorMessage && (
        <p
          role="alert"
          style={{
            padding: "12px",
            color: "#b91c1c",
            background: "#fef2f2",
            borderRadius: "8px",
          }}
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          style={{
            padding: "12px",
            color: "#166534",
            background: "#f0fdf4",
            borderRadius: "8px",
          }}
        >
          {successMessage}
        </p>
      )}

      <div className="accounts-summary">
        <article className="accounts-summary-card">
          <span>Saldo total</span>
          <strong>
            {loading ? "Cargando..." : formatMoney(totalBalance)}
          </strong>
        </article>

        <article className="accounts-summary-card">
          <span>Cuentas activas</span>
          <strong>
            {loading ? "..." : activeAccounts.length}
          </strong>
        </article>
      </div>

      <article className="accounts-panel">
        <h3>Nueva cuenta</h3>

        <form
          className="accounts-form"
          onSubmit={handleSubmit}
        >
          <label>
            Nombre
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej. Cuenta Interbank"
              required
              disabled={loading || saving}
            />
          </label>

          <label>
            Tipo
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              required
              disabled={loading || saving}
            >
              <option value="">Seleccionar tipo</option>

              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            Saldo inicial (S/)
            <input
              type="number"
              name="balance"
              min="0"
              step="0.01"
              value={form.balance}
              onChange={handleChange}
              placeholder="0.00"
              required
              disabled={loading || saving}
            />
          </label>

          <button
            className="accounts-submit"
            type="submit"
            disabled={
              loading ||
              saving ||
              busyAccountId !== null
            }
          >
            {saving ? "Guardando..." : "Crear cuenta"}
          </button>
        </form>
      </article>

      <article className="accounts-panel">
        <div className="accounts-panel-heading">
          <h3>Cuentas registradas</h3>
          <span>
            {loading ? "Cargando..." : `${accounts.length} cuentas`}
          </span>
        </div>

        {loading ? (
          <p>Cargando cuentas desde Supabase...</p>
        ) : accounts.length === 0 ? (
          <p>
            Todavía no tienes cuentas registradas.
            Crea tu primera cuenta para comenzar.
          </p>
        ) : (
          <div className="accounts-grid">
            {accounts.map((account) => (
              <article
                className={`account-card ${
                  !account.active ? "account-disabled" : ""
                }`}
                key={account.id}
              >
                <div>
                  <span className="account-type">
                    {account.type}
                  </span>

                  <h3>{account.name}</h3>

                  <p>Saldo disponible</p>

                  <strong>
                    {formatMoney(account.balance)}
                  </strong>
                </div>

                <div className="account-actions">
                  <button
                    type="button"
                    className="account-toggle"
                    disabled={
                      saving ||
                      busyAccountId !== null
                    }
                    onClick={() => handleToggle(account)}
                  >
                    {busyAccountId === account.id
                      ? "Procesando..."
                      : account.active
                        ? "Desactivar"
                        : "Activar"}
                  </button>

                  <button
                    type="button"
                    className="account-delete"
                    disabled={
                      saving ||
                      busyAccountId !== null
                    }
                    onClick={() => handleDelete(account)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
