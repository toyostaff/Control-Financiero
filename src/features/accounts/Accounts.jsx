import { useState } from "react";
import useFinance from "../../hooks/useFinance";
import "./Accounts.css";


const accountTypes = [
  "Efectivo",
  "Cuenta bancaria",
  "Billetera digital",
  "Cuenta de ahorro",
];

const formatMoney = (amount) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);

export default function Accounts() {
  const { accounts, addAccount, toggleAccount, deleteAccount } = useFinance();

  const [form, setForm] = useState({
    name: "",
    type: "",
    balance: "",
  });

  const totalBalance = accounts
    .filter((account) => account.active)
    .reduce((sum, account) => sum + account.balance, 0);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const balance = Number(form.balance);

    if (!form.name.trim() || !form.type || !Number.isFinite(balance)) {
      alert("Completa los datos de la cuenta correctamente.");
      return;
    }

    const newAccount = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      type: form.type,
      balance,
      active: true,
    };

    addAccount(newAccount);

    setForm({
      name: "",
      type: "",
      balance: "",
    });
  }

  return (
    <section className="accounts-page">
      <header className="accounts-heading">
        <div>
          <h2>Mis cuentas</h2>
          <p>Administra dónde guardas y manejas tu dinero.</p>
        </div>
      </header>

      <div className="accounts-summary">
        <article className="accounts-summary-card">
          <span>Saldo total</span>
          <strong>{formatMoney(totalBalance)}</strong>
        </article>

        <article className="accounts-summary-card">
          <span>Cuentas activas</span>
          <strong>{accounts.filter((account) => account.active).length}</strong>
        </article>
      </div>

      <article className="accounts-panel">
        <h3>Nueva cuenta</h3>

        <form className="accounts-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej. Cuenta Interbank"
              required
            />
          </label>

          <label>
            Tipo
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              required
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
              step="0.01"
              value={form.balance}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </label>

          <button className="accounts-submit" type="submit">
            Crear cuenta
          </button>
        </form>
      </article>

      <article className="accounts-panel">
        <div className="accounts-panel-heading">
          <h3>Cuentas registradas</h3>
          <span>{accounts.length} cuentas</span>
        </div>

        <div className="accounts-grid">
          {accounts.map((account) => (
            <article
              className={`account-card ${
                !account.active ? "account-disabled" : ""
              }`}
              key={account.id}
            >
              <div>
                <span className="account-type">{account.type}</span>

                <h3>{account.name}</h3>

                <p>Saldo disponible</p>

                <strong>{formatMoney(account.balance)}</strong>
              </div>

              <div className="account-actions">
                <button
                  type="button"
                  className="account-toggle"
                  onClick={() => toggleAccount(account.id)}
                >
                  {account.active ? "Desactivar" : "Activar"}
                </button>

                <button
                  type="button"
                  className="account-delete"
                  onClick={() => deleteAccount(account.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}