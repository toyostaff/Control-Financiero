
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

import Sidebar from "./Sidebar";
import "./MainLayout.css";

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const navigate = useNavigate();

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLogoutError("No se pudo cerrar la sesión. Intenta nuevamente.");
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Ocurrió un error al cerrar la sesión.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="app-content">
        <header className="app-header">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <h1>Control Financiero</h1>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              marginLeft: "auto",
              padding: "9px 14px",
              backgroundColor: "#b91c1c",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: loggingOut ? "wait" : "pointer",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            {loggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </header>

        {logoutError && (
          <p
            role="alert"
            style={{
              padding: "10px 20px",
              color: "#b91c1c",
            }}
          >
            {logoutError}
          </p>
        )}

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}



