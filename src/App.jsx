
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './features/Dashboard/Dashboard'

function Page({ title }) {
  return <h2>{title}</h2>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Page title="Iniciar sesión" />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Page title="Dashboard" />} />
        <Route path="/gastos" element={<Page title="Gastos" />} />
        <Route path="/ingresos" element={<Page title="Ingresos" />} />
        <Route path="/cuentas" element={<Page title="Cuentas" />} />
        <Route path="/categorias" element={<Page title="Categorías" />} />
        <Route path="/presupuestos" element={<Page title="Presupuestos" />} />
        <Route path="/metas" element={<Page title="Metas de ahorro" />} />
        <Route path="/dashboard" element={<Dashboard />} />

      </Route>

      <Route path="*" element={<Page title="Página no encontrada" />} />
    </Routes>
  )
}
