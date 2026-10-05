import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = [
  '#32795c',
  '#60a5fa',
  '#f59e0b',
  '#a78bfa',
  '#f87171',
  '#14b8a6',
  '#f97316',
]

const formatMoney = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE')}`

export default function FinancialCharts({
  monthlyData,
  categoryData,
}) {
  return (
    <div className="dashboard-panels">
      <article className="dashboard-panel">
        <h3>Ingresos y gastos</h3>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatMoney} width={85} />
              <Tooltip formatter={formatMoney} />
              <Legend />

              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill="#32795c"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="gastos"
                name="Gastos"
                fill="#f87171"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="dashboard-panel">
        <h3>Gastos por categoría</h3>

        {categoryData.length === 0 ? (
          <div className="dashboard-placeholder">
            Registra gastos para visualizar este gráfico.
          </div>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                >
                  {categoryData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={formatMoney} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </div>
  )
}