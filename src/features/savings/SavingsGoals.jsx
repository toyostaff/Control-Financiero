import { useState } from 'react'
import useFinance from '../../hooks/useFinance'
import './SavingsGoals.css'

const formatMoney = (amount) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)

export default function SavingsGoals() {
  const {
    goals,
    addGoal,
    addGoalContribution,
    deleteGoal,
  } = useFinance()

  const [form, setForm] = useState({
    name: '',
    target: '',
    deadline: '',
  })

  const totalTarget = goals.reduce(
    (sum, goal) => sum + goal.target,
    0
  )

  const totalSaved = goals.reduce(
    (sum, goal) => sum + goal.saved,
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

    const target = Number(form.target)

    if (
      !form.name.trim() ||
      !Number.isFinite(target) ||
      target <= 0 ||
      !form.deadline
    ) {
      alert(
        'Completa los datos de la meta correctamente.'
      )
      return
    }

    addGoal({
      name: form.name.trim(),
      target,
      deadline: form.deadline,
    })

    setForm({
      name: '',
      target: '',
      deadline: '',
    })
  }

  function handleContribution(id) {
    const input = window.prompt(
      '¿Cuánto deseas aportar a esta meta?'
    )

    if (input === null) {
      return
    }

    const amount = Number(input)

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert('Ingresa un importe válido.')
      return
    }

    addGoalContribution(id, amount)
  }

  function handleDelete(id) {
    if (
      !window.confirm(
        '¿Deseas eliminar esta meta?'
      )
    ) {
      return
    }

    deleteGoal(id)
  }

  return (
    <section className="savings-page">
      <header className="savings-heading">
        <h2>Metas de ahorro</h2>

        <p>
          Define objetivos y controla cuánto falta para
          alcanzarlos.
        </p>
      </header>

      <div className="savings-summary">
        <article className="savings-summary-card">
          <span>Objetivo total</span>
          <strong>{formatMoney(totalTarget)}</strong>
        </article>

        <article className="savings-summary-card saved">
          <span>Total ahorrado</span>
          <strong>{formatMoney(totalSaved)}</strong>
        </article>

        <article className="savings-summary-card">
          <span>Pendiente</span>

          <strong>
            {formatMoney(
              Math.max(
                totalTarget - totalSaved,
                0
              )
            )}
          </strong>
        </article>
      </div>

      <article className="savings-panel">
        <h3>Nueva meta</h3>

        <form
          className="savings-form"
          onSubmit={handleSubmit}
        >
          <label>
            Nombre de la meta

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej. Comprar una laptop"
              required
            />
          </label>

          <label>
            Objetivo (S/)

            <input
              type="number"
              name="target"
              min="0.01"
              step="0.01"
              value={form.target}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </label>

          <label>
            Fecha objetivo

            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              required
            />
          </label>

          <button
            className="savings-submit"
            type="submit"
          >
            Crear meta
          </button>
        </form>
      </article>

      <div className="savings-grid">
        {goals.map((goal) => {
          const percentage =
            goal.target > 0
              ? Math.min(
                  (goal.saved / goal.target) * 100,
                  100
                )
              : 0

          return (
            <article
              className="goal-card"
              key={goal.id}
            >
              <div className="goal-heading">
                <div>
                  <h3>{goal.name}</h3>

                  <span>
                    Meta: {goal.deadline}
                  </span>
                </div>

                <strong>
                  {Math.round(percentage)}%
                </strong>
              </div>

              <div className="goal-values">
                <div>
                  <span>Ahorrado</span>

                  <strong>
                    {formatMoney(goal.saved)}
                  </strong>
                </div>

                <div>
                  <span>Objetivo</span>

                  <strong>
                    {formatMoney(goal.target)}
                  </strong>
                </div>
              </div>

              <div className="goal-progress">
                <div
                  className="goal-progress-bar"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>

              <p className="goal-remaining">
                Faltan{' '}
                {formatMoney(
                  Math.max(
                    goal.target - goal.saved,
                    0
                  )
                )}
              </p>

              <div className="goal-actions">
                <button
                  type="button"
                  className="goal-contribute"
                  onClick={() =>
                    handleContribution(goal.id)
                  }
                  disabled={
                    goal.saved >= goal.target
                  }
                >
                  {goal.saved >= goal.target
                    ? 'Meta alcanzada'
                    : 'Agregar aporte'}
                </button>

                <button
                  type="button"
                  className="goal-delete"
                  onClick={() =>
                    handleDelete(goal.id)
                  }
                >
                  Eliminar
                </button>
              </div>
            </article>
          )
        })}

        {goals.length === 0 && (
          <p className="savings-empty">
            No tienes metas de ahorro registradas.
          </p>
        )}
      </div>
    </section>
  )
}