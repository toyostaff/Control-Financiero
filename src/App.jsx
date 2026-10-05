import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './features/Dashboard/Dashboard'
import Expenses from './features/expenses/Expenses'
import Income from './features/income/Income'
import Accounts from './features/accounts/Accounts'
import Categories from './features/categories/Categories'
import Budgets from './features/budgets/Budgets'
import SavingsGoals from './features/savings/SavingsGoals'
import TransactionHistory from './features/transactions/TransactionHistory'

function Page({ title }) {
  return <h2>{title}</h2>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Page title="Iniciar sesión" />} />

      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gastos" element={<Expenses />} />
        <Route path="/ingresos" element={<Income />} />
        <Route path="/cuentas" element={<Accounts />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/presupuestos" element={<Budgets />} />
        <Route path="/metas" element={<SavingsGoals />} />
        <Route
          path="/historial"
          element={<TransactionHistory />}
        />
      </Route>

      <Route
        path="*"
        element={<Page title="Página no encontrada" />}
      />
    </Routes>
  )
}