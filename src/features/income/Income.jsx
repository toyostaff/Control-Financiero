import { useState } from "react";
import useFinance from "../../hooks/useFinance";
import "./Income.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)

export default function Income() {
  const {
    transactions,
    accounts,
    categories,
    addTransaction,
    deleteTransaction,
  } = useFinance()

  const income = transactions.filter(
    (transaction) => transaction.type === 'income'
  )

  const availableCategories = categories.filter(
    (category) =>
      category.type === 'income' && category.active
  )

  const availableAccounts = accounts.filter(
    (account) => account.active
  )

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    accountId: '',
    date: new Date().toLocaleDateString('en-CA'),
  })

  const total = income.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const result = addTransaction({
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category,
      accountId: form.accountId,
      date: form.date,
      type: 'income',
    })

    if (!result.ok) {
      alert(result.message)
      return
    }

    setForm({
      description: '',
      amount: '',
      category: '',
      accountId: '',
      date: new Date().toLocaleDateString('en-CA'),
    })
  }

  function handleDelete(id) {
    if (!window.confirm('¿Deseas eliminar este ingreso?')) return
    deleteTransaction(id)
  }

  return (
    <section className="income-page">
      <header className="income-heading">
        <div>
          <h2>Mis ingresos</h2>
          <p>Registra y controla el dinero que recibes.</p>
        </div>
      </header>

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

        <form className="income-form" onSubmit={handleSubmit}>
          <label>
            Descripción
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ej. Sueldo mensual"
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
              required
            />
          </label>

          <label>
            Categoría
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar categoría</option>

              {availableCategories.map((category) => (
                <option key={category.id} value={category.name}>
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
              required
            >
              <option value="">Seleccionar cuenta</option>

              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} — {formatMoney(account.balance)}
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
              required
            />
          </label>

          <button className="income-submit" type="submit">
            Guardar ingreso
          </button>
        </form>
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
              {income.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.description}</td>
                  <td>{item.category}</td>
                  <td>{item.account}</td>
                  <td className="income-amount">
                    {formatMoney(item.amount)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="income-delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {income.length === 0 && (
                <tr>
                  <td colSpan="6" className="income-empty">
                    No tienes ingresos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}