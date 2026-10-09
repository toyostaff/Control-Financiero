import { useEffect, useRef, useState } from "react";
import { getAccounts } from "../../services/accountsService";
import {
  getAccountTransfers,
  registerAccountTransfer,
  reverseAccountTransfer,
} from "../../services/transfersService";
import "./Transfers.css";

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Transfers() {
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [reversingId, setReversingId] = useState(null);
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(getLocalDate());
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const requestIdRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      try {
        const [data, transferData] = await Promise.all([
          getAccounts(),
          getAccountTransfers(),
        ]);

        if (active) {
          setAccounts(data);
          setTransfers(transferData);
        }
      } catch (error) {
        if (active) setErrorMessage(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccounts();

    return () => {
      active = false;
    };
  }, []);

  function resetRequest() {
    requestIdRef.current = null;
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) return;

    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      setErrorMessage("Selecciona dos cuentas diferentes.");
      return;
    }

    if (!requestIdRef.current) {
      requestIdRef.current = crypto.randomUUID();
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await registerAccountTransfer({
        fromAccountId,
        toAccountId,
        amount,
        transferDate,
        description,
        requestId: requestIdRef.current,
      });

      const [updatedAccounts, updatedTransfers] = await Promise.all([
        getAccounts(),
        getAccountTransfers(),
      ]);

      setAccounts(updatedAccounts);
      setTransfers(updatedTransfers);

      requestIdRef.current = null;
      setFromAccountId("");
      setToAccountId("");
      setAmount("");
      setDescription("");
      setTransferDate(getLocalDate());
      setSuccessMessage("Transferencia registrada correctamente.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleReverse(transfer) {
    if (reversingId || submittingRef.current || transfer.reversed_at) return;

    const confirmed = window.confirm(
      `¿Deseas revertir la transferencia de S/ ${transfer.amount.toFixed(2)}?`
    );

    if (!confirmed) return;

    setReversingId(transfer.id);
    setHistoryMessage("");
    setHistoryError("");

    try {
      await reverseAccountTransfer(transfer.id);

      const [updatedAccounts, updatedTransfers] = await Promise.all([
        getAccounts(),
        getAccountTransfers(),
      ]);

      setAccounts(updatedAccounts);
      setTransfers(updatedTransfers);
      setHistoryMessage("Transferencia revertida correctamente.");
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setReversingId(null);
    }
  }

  const origin = accounts.find((account) => account.id === fromAccountId);
  const destination = accounts.find((account) => account.id === toAccountId);

  return (
    <section className="transfers-page">
      <header className="transfers-header">
        <h1>Transferencias entre cuentas</h1>
        <p>
          Transfiere dinero entre tus cuentas sin generar ingresos
          ni gastos adicionales.
        </p>
      </header>

      <div className="transfers-card">
        <h2>Nueva transferencia</h2>

        {loading ? (
          <p>Cargando cuentas...</p>
        ) : accounts.filter((account) => account.active).length < 2 ? (
          <p>Necesitas al menos dos cuentas activas para transferir dinero.</p>
        ) : (
          <form onSubmit={handleSubmit} className="transfers-form">
            <label htmlFor="transfer-origin">Cuenta de origen</label>
            <select
              id="transfer-origin"
              value={fromAccountId}
              onChange={(event) => {
                setFromAccountId(event.target.value);
                resetRequest();
              }}
              required
            >
              <option value="">Selecciona una cuenta</option>
              {accounts.filter((account) => account.active).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} — S/ {account.balance.toFixed(2)}
                </option>
              ))}
            </select>

            <label htmlFor="transfer-destination">Cuenta de destino</label>
            <select
              id="transfer-destination"
              value={toAccountId}
              onChange={(event) => {
                setToAccountId(event.target.value);
                resetRequest();
              }}
              required
            >
              <option value="">Selecciona una cuenta</option>
              {accounts
                .filter((account) => account.active && account.id !== fromAccountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — S/ {account.balance.toFixed(2)}
                  </option>
                ))}
            </select>

            {origin && destination && (
              <p className="transfers-summary">
                De {origin.name} hacia {destination.name}
              </p>
            )}

            <label htmlFor="transfer-amount">Monto (S/)</label>
            <input
              id="transfer-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                resetRequest();
              }}
              required
            />

            <label htmlFor="transfer-date">Fecha</label>
            <input
              id="transfer-date"
              type="date"
              value={transferDate}
              onChange={(event) => {
                setTransferDate(event.target.value);
                resetRequest();
              }}
              required
            />

            <label htmlFor="transfer-description">Descripción (opcional)</label>
            <textarea
              id="transfer-description"
              rows="3"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                resetRequest();
              }}
              placeholder="Ej. Transferencia a cuenta de ahorros"
            />

            {errorMessage && <p role="alert" className="transfers-error">{errorMessage}</p>}
            {successMessage && <p role="status" className="transfers-success">{successMessage}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? "Procesando..." : "Realizar transferencia"}
            </button>
          </form>
        )}
      </div>

      <div className="transfers-card">
        <h2>Historial de transferencias</h2>

        {historyError && (
          <p role="alert" className="transfers-error">{historyError}</p>
        )}

        {historyMessage && (
          <p role="status" className="transfers-success">{historyMessage}</p>
        )}

        {transfers.length === 0 ? (
          <p>No hay transferencias registradas.</p>
        ) : (
          <div className="transfers-table-container">
            <table className="transfers-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{transfer.transfer_date}</td>

                    <td>
                      {accounts.find(
                        (account) =>
                          account.id === transfer.from_account_id
                      )?.name || "Cuenta no disponible"}
                    </td>

                    <td>
                      {accounts.find(
                        (account) =>
                          account.id === transfer.to_account_id
                      )?.name || "Cuenta no disponible"}
                    </td>

                    <td>S/ {transfer.amount.toFixed(2)}</td>

                    <td>{transfer.description || "—"}</td>

                    <td>
                      <span
                        className={
                          transfer.reversed_at
                            ? "transfer-status-reversed"
                            : "transfer-status-completed"
                        }
                      >
                        {transfer.reversed_at
                          ? "Revertida"
                          : "Completada"}
                      </span>
                    </td>

                    <td>
                      {!transfer.reversed_at && (
                        <button
                          type="button"
                          className="transfer-reverse-button"
                          disabled={reversingId !== null || submitting}
                          onClick={() => handleReverse(transfer)}
                        >
                          {reversingId === transfer.id
                            ? "Revirtiendo..."
                            : "Revertir"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
