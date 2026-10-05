import useFinance from "../../hooks/useFinance";
import './Dashboard.css'
import FinancialCharts from './FinancialCharts'

const formatMoney = (amount) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)

const monthNames = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

export default function Dashboard() {
  const { accounts, transactions } = useFinance()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const activeAccounts = accounts.filter(
    (account) => account.active
  )

  const totalBalance = activeAccounts.reduce(
    (sum, account) => sum + account.balance,
    0
  )

  const currentMonthTransactions = transactions.filter(
    (transaction) => {
      const [year, month] = transaction.date
        .split('-')
        .map(Number)

      return (
        year === currentYear &&
        month - 1 === currentMonth
      )
    }
  )

  const monthIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    )

  const monthExpenses = currentMonthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    )

  const monthSavings = monthIncome - monthExpenses

  const indicators = [
    {
      title: 'Saldo total',
      value: formatMoney(totalBalance),
      description: 'Disponible en todas tus cuentas',
      type: 'balance',
    },
    {
      title: 'Ingresos del mes',
      value: formatMoney(monthIncome),
      description: 'Ingresos registrados este mes',
      type: 'income',
    },
    {
      title: 'Gastos del mes',
      value: formatMoney(monthExpenses),
      description: 'Gastos registrados este mes',
      type: 'expense',
    },
    {
      title: 'Ahorro del mes',
      value: formatMoney(monthSavings),
      description: 'Ingresos menos gastos',
      type: 'savings',
    },
  ]

  const monthlyData = monthNames.map((month, index) => {
    const monthTransactions = transactions.filter(
      (transaction) => {
        const [year, transactionMonth] =
          transaction.date.split('-').map(Number)

        return (
          year === currentYear &&
          transactionMonth - 1 === index
        )
      }
    )

    return {
      month,
      ingresos: monthTransactions
        .filter((item) => item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0),

      gastos: monthTransactions
        .filter((item) => item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0),
    }
  })

  const expenseMap = {}

  currentMonthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      expenseMap[transaction.category] =
        (expenseMap[transaction.category] || 0) +
        transaction.amount
    })

  const categoryData = Object.entries(expenseMap).map(
    ([name, value]) => ({
      name,
      value,
    })
  )

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

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
            <p className="indicator-title">
              {indicator.title}
            </p>

            <h3>{indicator.value}</h3>

            <p className="indicator-description">
              {indicator.description}
            </p>
          </article>
        ))}
      </div>

      <FinancialCharts
        monthlyData={monthlyData}
        categoryData={categoryData}
      />

      <article className="dashboard-panel">
        <h3>Últimos movimientos</h3>

        {recentTransactions.length === 0 ? (
          <div className="dashboard-empty">
            Aún no tienes movimientos registrados.
          </div>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta</th>
                  <th>Importe</th>
                </tr>
              </thead>

              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.account}</td>
                    <td
                      className={
                        transaction.type === 'income'
                          ? 'history-income'
                          : 'history-expense'
                      }
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatMoney(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}