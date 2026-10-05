import { useState } from 'react'
import useFinance from '../../hooks/useFinance'
import './Categories.css'

export default function Categories() {
  const {
    categories,
    addCategory,
    toggleCategory,
    deleteCategory,
  } = useFinance()

  const [name, setName] = useState('')
  const [type, setType] = useState('expense')

  function handleSubmit(event) {
    event.preventDefault()

    const cleanName = name.trim()

    if (!cleanName) {
      alert('Ingresa el nombre de la categoría.')
      return
    }

    const exists = categories.some(
      (category) =>
        category.type === type &&
        category.name.toLowerCase() ===
          cleanName.toLowerCase()
    )

    if (exists) {
      alert('Esta categoría ya existe.')
      return
    }

    addCategory({
      name: cleanName,
      type,
    })

    setName('')
  }

  function handleDelete(id) {
    if (
      !window.confirm(
        '¿Deseas eliminar esta categoría?'
      )
    ) {
      return
    }

    deleteCategory(id)
  }

  const expenseCategories = categories.filter(
    (category) => category.type === 'expense'
  )

  const incomeCategories = categories.filter(
    (category) => category.type === 'income'
  )

  function renderCategories(items) {
    if (items.length === 0) {
      return (
        <p className="categories-empty">
          No existen categorías registradas.
        </p>
      )
    }

    return (
      <div className="categories-list">
        {items.map((category) => (
          <article
            className={`category-item ${
              !category.active ? 'category-disabled' : ''
            }`}
            key={category.id}
          >
            <div>
              <strong>{category.name}</strong>

              <span>
                {category.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <div className="category-actions">
              <button
                type="button"
                className="category-toggle"
                onClick={() =>
                  toggleCategory(category.id)
                }
              >
                {category.active
                  ? 'Desactivar'
                  : 'Activar'}
              </button>

              <button
                type="button"
                className="category-delete"
                onClick={() =>
                  handleDelete(category.id)
                }
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <section className="categories-page">
      <header className="categories-heading">
        <h2>Categorías</h2>

        <p>
          Organiza tus ingresos y gastos para controlar
          mejor tus finanzas.
        </p>
      </header>

      <div className="categories-summary">
        <article className="categories-summary-card expense">
          <span>Categorías de gastos</span>
          <strong>{expenseCategories.length}</strong>
        </article>

        <article className="categories-summary-card income">
          <span>Categorías de ingresos</span>
          <strong>{incomeCategories.length}</strong>
        </article>
      </div>

      <article className="categories-panel">
        <h3>Nueva categoría</h3>

        <form
          className="categories-form"
          onSubmit={handleSubmit}
        >
          <label>
            Nombre

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Ej. Mascotas"
              required
            />
          </label>

          <label>
            Tipo

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </label>

          <button
            type="submit"
            className="categories-submit"
          >
            Crear categoría
          </button>
        </form>
      </article>

      <div className="categories-columns">
        <article className="categories-panel">
          <div className="categories-title">
            <h3>Categorías de gastos</h3>
            <span>{expenseCategories.length}</span>
          </div>

          {renderCategories(expenseCategories)}
        </article>

        <article className="categories-panel">
          <div className="categories-title">
            <h3>Categorías de ingresos</h3>
            <span>{incomeCategories.length}</span>
          </div>

          {renderCategories(incomeCategories)}
        </article>
      </div>
    </section>
  )
}