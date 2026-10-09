
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { supabase } from "./lib/supabase";

import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./features/Dashboard/Dashboard";
import Expenses from "./features/expenses/Expenses";
import Income from "./features/income/Income";
import Accounts from "./features/accounts/Accounts";
import Categories from "./features/categories/Categories";
import Budgets from "./features/budgets/Budgets";
import SavingsGoals from "./features/savings/SavingsGoals";
import TransactionHistory from "./features/transactions/TransactionHistory";
import Debts from "./features/debts/Debts";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        setErrorMessage("Correo o contraseña incorrectos.");
        return;
      }

      if (data.session) {
        onLogin(data.session);
      }
    } catch {
      setErrorMessage("No se pudo conectar con Supabase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f3f6fa",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          background: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            color: "#172b4d",
            marginBottom: "8px",
          }}
        >
          Control Financiero
        </h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: "28px",
          }}
        >
          Ingresa con tu cuenta autorizada.
        </p>

        <label
          htmlFor="login-email"
          style={{
            display: "block",
            marginBottom: "8px",
          }}
        >
          Correo electrónico
        </label>

        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="correo@ejemplo.com"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        <label
          htmlFor="login-password"
          style={{
            display: "block",
            marginBottom: "8px",
          }}
        >
          Contraseña
        </label>

        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        {errorMessage && (
          <p
            role="alert"
            style={{ color: "#b91c1c" }}
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            background: "#287d68",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading
            ? "Ingresando..."
            : "Iniciar sesión"}
        </button>

        <p
          style={{
            marginTop: "22px",
            color: "#64748b",
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          Acceso exclusivo para usuarios autorizados.
        </p>
      </form>
    </main>
  );
}

function ProtectedLayout({ session }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
<Outlet />
  );
}

function Page({ title }) {
  return <h2>{title}</h2>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] =
    useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error(
            "Error al consultar la sesión:",
            error.message
          );
        }

        setSession(data.session);
        setCheckingSession(false);
      }
    ).catch((error) => {
      if (!active) return;

      console.error(
        "Error al verificar la sesión:",
        error
      );

      setCheckingSession(false);
    });

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!active) return;

          setSession(newSession);
          setCheckingSession(false);
        }
      );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
        }}
      >
        Verificando sesión...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate
              to="/dashboard"
              replace
            />
          ) : (
            <Login onLogin={setSession} />
          )
        }
      />

      <Route
        element={
          <ProtectedLayout session={session} />
        }
      >
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/gastos"
            element={<Expenses />}
          />

          <Route
            path="/ingresos"
            element={<Income />}
          />

          <Route
            path="/cuentas"
            element={<Accounts />}
          />

          <Route
            path="/categorias"
            element={<Categories />}
          />

          <Route
            path="/presupuestos"
            element={<Budgets />}
          />

          <Route
            path="/metas"
            element={<SavingsGoals />}
          />

          <Route
            path="/historial"
            element={<TransactionHistory />}
          />

          <Route
            path="/deudas"
            element={<Debts />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Page title="Página no encontrada" />
        }
      />
    </Routes>
  );
}
