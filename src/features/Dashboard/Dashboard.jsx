
import './Dashboard.css'

const indicators = [
  {
    title: 'Saldo total',
    value: 'S/ 0.00',
    description: 'Disponible en todas tus cuentas',
    type: 'balance',
  },
  {
    title: 'Ingresos del mes',
    value: 'S/ 0.00',
    description: 'Ingresos registrados',
    type: 'income',
  },
  {
    title: 'Gastos del mes',
    value: 'S/ 0.00',
    description: 'Gastos registrados',
    type: 'expense',
  },
  {
    title: 'Ahorro del mes',
    value: 'S/ 0.00',
    description: 'Ingresos menos gastos',
    type: 'savings',
  },
]

export default function Dashboard() {
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h2>Resumen financiero</h2>
          <p>Consulta el estado general de tus finanzas.</p>
        </div>
        <span className="dashboard-period">Este mes</span>
      </div>

      <div className="indicator-grid">
        {indicators.map((indicator) => (
          <article
            className={`indicator-card indicator-${indicator.type}`}
            key={indicator.title}
          >
            <p className="indicator-title">{indicator.title}</p>
            <h3>{indicator.value}</h3>
            <p className="indicator-description">
              {indicator.description}
            </p>
          </article>
        ))}
      </div>

      <div className="dashboard-panels">
        <article className="dashboard-panel">
          <h3>Ingresos y gastos</h3>
          <div className="dashboard-placeholder">
            Próximamente: gráfico comparativo
          </div>
        </article>

        <article className="dashboard-panel">
          <h3>Gastos por categoría</h3>
          <div className="dashboard-placeholder">
            Próximamente: distribución de gastos
          </div>
        </article>
      </div>

      <article className="dashboard-panel">
        <h3>Últimos movimientos</h3>
        <div className="dashboard-empty">
          Aún no tienes movimientos registrados.
        </div>
      </article>
    </section>
  )
}
