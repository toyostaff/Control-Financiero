import { useMemo, useState } from "react";
import useFinance from "../../hooks/useFinance";
import "./TransactionHistory.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)

export default function TransactionHistory() {
  const { transactions } = useFinance()

  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase()

    return [...transactions]
      .filter(
        (transaction) =>
          typeFilter === 'all' ||
          transaction.type === typeFilter
      )
      .filter(
        (transaction) =>
          !term ||
          transaction.description.toLowerCase().includes(term) ||
          transaction.category.toLowerCase().includes(term) ||
          transaction.account.toLowerCase().includes(term)
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, typeFilter, search])

  return (
    <section className="history-page">
      <header className="history-heading">
        <h2>Historial</h2>
        <p>
          Consulta todos tus ingresos y gastos en un solo lugar.
        </p>
      </header>

      <article className="history-panel">
        <div className="history-filters">
          <label>
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Descripción, categoría o cuenta"
            />
          </label>

          <label>
            Tipo
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </label>
        </div>
      </article>

      <article className="history-panel">
        <div className="history-panel-heading">
          <h3>Movimientos</h3>
          <span>{filteredTransactions.length} resultados</span>
        </div>

        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Importe</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.date}</td>
                  <td>{transaction.description}</td>

                  <td>
                    <span
                      className={`history-type ${transaction.type}`}
                    >
                      {transaction.type === 'income'
                        ? 'Ingreso'
                        : 'Gasto'}
                    </span>
                  </td>

                  <td>{transaction.category}</td>
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

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="history-empty">
                    No se encontraron movimientos.
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