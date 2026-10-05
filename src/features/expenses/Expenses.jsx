import { useState } from "react";
import useFinance from "../../hooks/useFinance";
import "./Expenses.css";


const formatMoney = (amount) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)

export default function Expenses() {
  const {
    transactions,
    accounts,
    categories,
    addTransaction,
    deleteTransaction,
  } = useFinance()

  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense'
  )

  const availableCategories = categories.filter(
    (category) =>
      category.type === 'expense' && category.active
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

  const total = expenses.reduce(
    (sum, expense) => sum + expense.amount,
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

    if (
      !form.description.trim() ||
      !form.category ||
      !form.accountId ||
      !form.date
    ) {
      alert('Completa todos los campos correctamente.')
      return
    }

    const result = addTransaction({
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category,
      accountId: form.accountId,
      date: form.date,
      type: 'expense',
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
    if (!window.confirm('¿Deseas eliminar este gasto?')) return
    deleteTransaction(id)
  }

  return (
    <section className="expenses-page">
      <header className="expenses-heading">
        <div>
          <h2>Mis gastos</h2>
          <p>Registra y organiza tus movimientos.</p>
        </div>
      </header>

      <div className="expenses-summary">
        <article className="expenses-summary-card">
          <span>Total registrado</span>
          <strong>{formatMoney(total)}</strong>
        </article>

        <article className="expenses-summary-card">
          <span>Número de movimientos</span>
          <strong>{expenses.length}</strong>
        </article>
      </div>

      <article className="expenses-card">
        <h3>Registrar nuevo gasto</h3>

        <form className="expenses-form" onSubmit={handleSubmit}>
          <label>
            Descripción
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ej. Compra de alimentos"
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
            Cuenta
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

          <button className="expenses-submit" type="submit">
            Guardar gasto
          </button>
        </form>
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
                <th>Cuenta</th>
                <th>Importe</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td>{expense.account}</td>
                  <td className="expenses-amount">
                    {formatMoney(expense.amount)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="expenses-delete"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="expenses-empty">
                    No tienes gastos registrados.
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