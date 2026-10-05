import { useState } from "react";
import useFinance from "../../hooks/useFinance";
import "./Budgets.css";



const formatMoney = (amount) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)

export default function Budgets() {
  const {
    budgets,
    categories,
    transactions,
    addBudget,
    deleteBudget,
  } = useFinance()

  const expenseCategories = categories.filter(
    (category) =>
      category.type === 'expense' && category.active
  )

  const [form, setForm] = useState({
    category: '',
    limit: '',
  })

  const budgetsWithSpent = budgets.map((budget) => {
    const spent = transactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          transaction.category === budget.category
      )
      .reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      )

    return {
      ...budget,
      spent,
    }
  })

  const totalBudget = budgetsWithSpent.reduce(
    (sum, budget) => sum + budget.limit,
    0
  )

  const totalSpent = budgetsWithSpent.reduce(
    (sum, budget) => sum + budget.spent,
    0
  )

  const totalAvailable = totalBudget - totalSpent

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const limit = Number(form.limit)

    if (!form.category || !Number.isFinite(limit) || limit <= 0) {
      alert('Completa los datos del presupuesto correctamente.')
      return
    }

    if (
      budgets.some(
        (budget) => budget.category === form.category
      )
    ) {
      alert('Ya existe un presupuesto para esta categoría.')
      return
    }

    addBudget({
      category: form.category,
      limit,
    })

    setForm({
      category: '',
      limit: '',
    })
  }

  function handleDelete(id) {
    if (!window.confirm('¿Deseas eliminar este presupuesto?')) return
    deleteBudget(id)
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
              required
            />
          </label>

          <button className="budgets-submit" type="submit">
            Crear presupuesto
          </button>
        </form>
      </article>

      <article className="budgets-panel">
        <div className="budgets-panel-heading">
          <h3>Presupuestos del mes</h3>
          <span>{budgets.length} registrados</span>
        </div>

        <div className="budgets-list">
          {budgetsWithSpent.map((budget) => {
            const percentage =
              budget.limit > 0
                ? (budget.spent / budget.limit) * 100
                : 0

            const remaining = budget.limit - budget.spent

            let status = 'normal'

            if (percentage >= 100) status = 'danger'
            else if (percentage >= 80) status = 'warning'

            return (
              <article className="budget-item" key={budget.id}>
                <div className="budget-item-heading">
                  <div>
                    <h4>{budget.category}</h4>
                    <p>
                      {formatMoney(budget.spent)} de{' '}
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
                      width: `${Math.min(percentage, 100)}%`,
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
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </article>
    </section>
  )
}