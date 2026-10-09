
import { useEffect, useRef, useState } from "react";

import {
  getCategories,
  createCategory,
  setCategoryActive,
  removeCategory,
} from "../../services/categoriesService";

import "./Categories.css";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const result = await getCategories();

        if (active) {
          setCategories(result);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error.message || "No se pudieron cargar las categorías."
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

  const expenseCategories = categories.filter(
    (category) => category.type === "expense"
  );

  const incomeCategories = categories.filter(
    (category) => category.type === "income"
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current || loading) return;

    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMessage("Ingresa el nombre de la categoría.");
      return;
    }

    const exists = categories.some(
      (category) =>
        category.type === type &&
        category.name.toLowerCase() ===
          cleanName.toLowerCase()
    );

    if (exists) {
      setErrorMessage("Esta categoría ya existe.");
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const created = await createCategory({
        name: cleanName,
        type,
      });

      setCategories((previous) => [
        ...previous,
        created,
      ]);

      setName("");
      setSuccessMessage(
        "Categoría creada correctamente en Supabase."
      );
    } catch (error) {
      setErrorMessage(
        error.message || "No se pudo crear la categoría."
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  async function handleToggle(category) {
    if (busyCategoryId !== null || saving) return;

    setBusyCategoryId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updated = await setCategoryActive(
        category.id,
        !category.active
      );

      setCategories((previous) =>
        previous.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setSuccessMessage(
        updated.active
          ? "Categoría activada correctamente."
          : "Categoría desactivada correctamente."
      );
    } catch (error) {
      setErrorMessage(
        error.message ||
          "No se pudo actualizar la categoría."
      );
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function handleDelete(category) {
    if (busyCategoryId !== null || saving) return;

    if (
      !window.confirm(
        `¿Deseas eliminar la categoría "${category.name}"?`
      )
    ) {
      return;
    }

    setBusyCategoryId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await removeCategory(category.id);

      setCategories((previous) =>
        previous.filter(
          (item) => item.id !== category.id
        )
      );

      setSuccessMessage(
        "Categoría eliminada correctamente."
      );
    } catch (error) {
      setErrorMessage(
        error.message ||
          "No se pudo eliminar la categoría."
      );
    } finally {
      setBusyCategoryId(null);
    }
  }

  function renderCategories(items) {
    if (loading) {
      return (
        <p className="categories-empty">
          Cargando categorías desde Supabase...
        </p>
      );
    }

    if (items.length === 0) {
      return (
        <p className="categories-empty">
          No existen categorías registradas.
        </p>
      );
    }

    return (
      <div className="categories-list">
        {items.map((category) => {
          const busy = busyCategoryId === category.id;

          return (
            <article
              className={`category-item ${
                !category.active
                  ? "category-disabled"
                  : ""
              }`}
              key={category.id}
            >
              <div>
                <strong>{category.name}</strong>

                <span>
                  {category.active
                    ? "Activa"
                    : "Inactiva"}
                </span>
              </div>

              <div className="category-actions">
                <button
                  type="button"
                  className="category-toggle"
                  disabled={
                    loading ||
                    saving ||
                    busyCategoryId !== null
                  }
                  onClick={() =>
                    handleToggle(category)
                  }
                >
                  {busy
                    ? "Procesando..."
                    : category.active
                      ? "Desactivar"
                      : "Activar"}
                </button>

                <button
                  type="button"
                  className="category-delete"
                  disabled={
                    loading ||
                    saving ||
                    busyCategoryId !== null
                  }
                  onClick={() =>
                    handleDelete(category)
                  }
                >
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
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
              disabled={loading || saving}
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
              disabled={loading || saving}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </label>

          <button
            type="submit"
            className="categories-submit"
            disabled={loading || saving}
          >
            {saving
              ? "Guardando..."
              : "Crear categoría"}
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
  );
}
