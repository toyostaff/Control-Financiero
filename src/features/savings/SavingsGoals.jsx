import { useEffect, useState } from "react";
import { getFinancialData } from "../../services/financeDataService";
import {
  createSavingsGoal,
  contributeToSavingsGoal,
  returnSavingsToAccount,
  spendSavings,
  deleteSavingsGoal,
} from "../../services/savingsService";
import "./SavingsGoals.css";

const money = (value) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value) || 0);

export default function SavingsGoals() {
  const [data, setData] = useState({
    goals: [],
    accounts: [],
    categories: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { goals, accounts, categories } = data;

  const [form, setForm] = useState({
    name: "",
    target: "",
    deadline: "",
  });

  const [contributions, setContributions] = useState({});
  const [actions, setActions] = useState({});

  const activeAccounts = accounts.filter((account) => account.active);

  const expenseCategories = categories.filter(
    (category) => category.active && category.type === "expense"
  );

  const totalTarget = goals.reduce(
    (sum, goal) => sum + Number(goal.target),
    0
  );

  const totalSaved = goals.reduce(
    (sum, goal) => sum + Number(goal.saved),
    0
  );

  async function refreshData() {
    const result = await getFinancialData();

    setData({
      goals: result.goals || [],
      accounts: result.accounts || [],
      categories: result.categories || [],
    });
  }

  useEffect(() => {
    let active = true;

    getFinancialData()
      .then((result) => {
        if (!active) return;

        setData({
          goals: result.goals || [],
          accounts: result.accounts || [],
          categories: result.categories || [],
        });
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "No se pudieron cargar las metas.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function executeAction(operation, successMessage) {
    if (busy) return false;

    setBusy(true);
    setError("");

    try {
      await operation();
      await refreshData();
      alert(successMessage);
      return true;
    } catch (err) {
      alert(err.message || "No se pudo completar la operación.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createGoal(event) {
    event.preventDefault();

    const ok = await executeAction(
      () => createSavingsGoal(form),
      "Meta creada correctamente."
    );

    if (ok) {
      setForm({
        name: "",
        target: "",
        deadline: "",
      });
    }
  }

  async function contribute(goal) {
    const values = contributions[goal.id] || {};

    const ok = await executeAction(
      () =>
        contributeToSavingsGoal(
          goal.id,
          values.amount,
          values.accountId
        ),
      "Aporte registrado correctamente."
    );

    if (ok) {
      setContributions((previous) => ({
        ...previous,
        [goal.id]: {},
      }));
    }
  }

  async function resolveGoal(goal) {
    const values = actions[goal.id] || {};

    if (!values.action || values.action === "keep") {
      alert("El dinero continúa reservado en tu meta.");
      return;
    }

    if (!window.confirm("¿Confirmas este movimiento de ahorro?")) {
      return;
    }

    const operation =
      values.action === "return"
        ? () =>
            returnSavingsToAccount(
              goal.id,
              values.amount,
              values.accountId
            )
        : values.action === "spend"
          ? () =>
              spendSavings(
                goal.id,
                values.amount,
                values.description,
                values.category
              )
          : null;

    if (!operation) {
      alert("Selecciona una operación válida.");
      return;
    }

    const ok = await executeAction(
      operation,
      "Movimiento registrado correctamente."
    );

    if (ok) {
      setActions((previous) => ({
        ...previous,
        [goal.id]: {},
      }));
    }
  }

  async function removeGoal(goal) {
    if (Number(goal.saved) > 0) {
      alert(
        `La meta "${goal.name}" tiene ${money(goal.saved)} reservados.\n\n` +
          "Primero debes devolver o gastar el dinero reservado."
      );

      setActions((previous) => ({
        ...previous,
        [goal.id]: {
          ...previous[goal.id],
          action: previous[goal.id]?.action || "return",
          amount: String(goal.saved),
        },
      }));

      return;
    }

    if (
      !window.confirm(
        `¿Eliminar la meta "${goal.name}"?\n\n` +
          "Por seguridad, las metas con historial financiero no pueden eliminarse."
      )
    ) {
      return;
    }

    await executeAction(
      () => deleteSavingsGoal(goal.id),
      "Meta eliminada correctamente."
    );
  }

  if (loading) {
    return (
      <section className="savings-page">
        <p>Cargando metas de ahorro desde Supabase...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="savings-page">
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="savings-page">
      <header className="savings-heading">
        <h2>Metas de ahorro</h2>
        <p>
          Organiza tus ahorros y decide cuándo aportar, gastar
          o devolver dinero a tus cuentas.
        </p>
      </header>

      <div className="savings-summary">
        <article className="savings-summary-card">
          <span>Objetivo total</span>
          <strong>{money(totalTarget)}</strong>
        </article>

        <article className="savings-summary-card saved">
          <span>Total reservado</span>
          <strong>{money(totalSaved)}</strong>
        </article>

        <article className="savings-summary-card">
          <span>Pendiente</span>
          <strong>
            {money(Math.max(0, totalTarget - totalSaved))}
          </strong>
        </article>
      </div>

      <article className="savings-panel">
        <h3>Nueva meta</h3>

        <form className="savings-form" onSubmit={createGoal}>
          <label>
            Nombre de la meta
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              placeholder="Comprar una laptop"
            />
          </label>

          <label>
            Objetivo (S/)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.target}
              onChange={(event) =>
                setForm({
                  ...form,
                  target: event.target.value,
                })
              }
            />
          </label>

          <label>
            Fecha objetivo
            <input
              required
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm({
                  ...form,
                  deadline: event.target.value,
                })
              }
            />
          </label>

          <button
            className="savings-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? "Procesando..." : "Crear meta"}
          </button>
        </form>
      </article>

      <div className="savings-grid">
        {goals.map((goal) => {
          const saved = Number(goal.saved);
          const target = Number(goal.target);

          const completed =
            saved >= target && target > 0;

          const percentage =
            target > 0
              ? Math.min(100, (saved / target) * 100)
              : 0;

          const contribution = contributions[goal.id] || {};
          const action = actions[goal.id] || {};

          return (
            <article className="goal-card" key={goal.id}>
              <div className="goal-heading">
                <div>
                  <h3>{goal.name}</h3>
                  <span>
                    Fecha objetivo: {goal.deadline}
                  </span>
                </div>

                <strong>
                  {Math.round(percentage)}%
                </strong>
              </div>

              <div className="goal-values">
                <div>
                  <span>Reservado</span>
                  <strong>{money(saved)}</strong>
                </div>

                <div>
                  <span>Objetivo</span>
                  <strong>{money(target)}</strong>
                </div>
              </div>

              <div className="goal-progress">
                <div
                  className="goal-progress-bar"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <p className="goal-remaining">
                {completed
                  ? "Meta completada."
                  : `Faltan ${money(Math.max(0, target - saved))}`}
              </p>

              {!completed && (
                <div className="goal-finance-form">
                  <h4>Agregar aporte</h4>

                  <label>
                    Cuenta de origen
                    <select
                      value={contribution.accountId || ""}
                      onChange={(event) =>
                        setContributions((previous) => ({
                          ...previous,
                          [goal.id]: {
                            ...contribution,
                            accountId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">
                        Selecciona una cuenta
                      </option>

                      {activeAccounts.map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} — {money(account.balance)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Importe (S/)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={Math.max(0, target - saved)}
                      value={contribution.amount || ""}
                      onChange={(event) =>
                        setContributions((previous) => ({
                          ...previous,
                          [goal.id]: {
                            ...contribution,
                            amount: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>

                  <button
                    className="goal-contribute"
                    type="button"
                    onClick={() => contribute(goal)}
                    disabled={busy}
                  >
                    Agregar aporte
                  </button>
                </div>
              )}

              {saved > 0 && (
                <div className="goal-finance-form">
                  <h4>Gestionar ahorro</h4>

                  <p>
                    Puedes utilizar o devolver tu dinero
                    sin necesidad de completar la meta.
                  </p>

                  <label>
                    ¿Qué deseas hacer?
                    <select
                      value={action.action || "keep"}
                      onChange={(event) =>
                        setActions((previous) => ({
                          ...previous,
                          [goal.id]: {
                            ...action,
                            action: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="keep">
                        Mantener ahorrado
                      </option>
                      <option value="spend">
                        Gastar ahorro
                      </option>
                      <option value="return">
                        Devolver a una cuenta
                      </option>
                    </select>
                  </label>

                  {action.action &&
                    action.action !== "keep" && (
                      <>
                        <label>
                          Importe (S/)
                          <input
                            type="number"
                            min="0.01"
                            max={saved}
                            step="0.01"
                            value={action.amount || ""}
                            onChange={(event) =>
                              setActions((previous) => ({
                                ...previous,
                                [goal.id]: {
                                  ...action,
                                  amount: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>

                        {action.action === "return" && (
                          <label>
                            Cuenta de destino
                            <select
                              value={action.accountId || ""}
                              onChange={(event) =>
                                setActions((previous) => ({
                                  ...previous,
                                  [goal.id]: {
                                    ...action,
                                    accountId: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="">
                                Selecciona una cuenta
                              </option>

                              {activeAccounts.map((account) => (
                                <option
                                  key={account.id}
                                  value={account.id}
                                >
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {action.action === "spend" && (
                          <>
                            <label>
                              ¿En qué gastaste el ahorro?
                              <input
                                type="text"
                                placeholder="Ejemplo: Compra de laptop"
                                value={action.description || ""}
                                onChange={(event) =>
                                  setActions((previous) => ({
                                    ...previous,
                                    [goal.id]: {
                                      ...action,
                                      description: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>

                            <label>
                              Categoría del gasto
                              <select
                                value={action.category || ""}
                                onChange={(event) =>
                                  setActions((previous) => ({
                                    ...previous,
                                    [goal.id]: {
                                      ...action,
                                      category: event.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="">
                                  Selecciona una categoría
                                </option>

                                {expenseCategories.map((category) => (
                                  <option
                                    key={category.id}
                                    value={category.name}
                                  >
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </>
                        )}
                      </>
                    )}

                  <button
                    className="goal-contribute"
                    type="button"
                    onClick={() => resolveGoal(goal)}
                    disabled={busy}
                  >
                    Confirmar decisión
                  </button>
                </div>
              )}

              <div className="goal-actions">
                <button
                  className="goal-delete"
                  type="button"
                  onClick={() => removeGoal(goal)}
                  disabled={busy}
                >
                  Eliminar meta
                </button>
              </div>
            </article>
          );
        })}

        {goals.length === 0 && (
          <p className="savings-empty">
            No tienes metas de ahorro registradas.
          </p>
        )}
      </div>
    </section>
  );
}