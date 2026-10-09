
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const menuItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/gastos", label: "Gastos" },
  { path: "/ingresos", label: "Ingresos" },
  { path: "/cuentas", label: "Cuentas" },
  { path: "/transferencias", label: "Transferencias" },
  { path: "/categorias", label: "Categorías" },
  { path: "/presupuestos", label: "Presupuestos" },
  { path: "/metas", label: "Metas de ahorro" },
  { path: "/deudas", label: "Deudas y préstamos" },
  { path: "/historial", label: "Historial" },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-brand">
          <h2>Control Financiero</h2>
          <p>Mis finanzas</p>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Menú principal"
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? "sidebar-link-active" : ""
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
