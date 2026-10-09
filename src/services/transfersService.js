import { supabase } from "../lib/supabase";

function getErrorMessage(error) {
  return error?.message || "Ocurrió un error inesperado.";
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Debes iniciar sesión para gestionar transferencias.");
  }

  return user;
}

export async function getAccountTransfers() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("account_transfers")
    .select(
      "id, user_id, from_account_id, to_account_id, amount, transfer_date, description, request_id, reversed_at, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data || []).map((transfer) => ({
    ...transfer,
    amount: Number(transfer.amount),
  }));
}

export async function registerAccountTransfer({
  fromAccountId,
  toAccountId,
  amount,
  transferDate,
  description = "",
  requestId,
}) {
  await getCurrentUser();

  const parsedAmount = Number(amount);

  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    throw new Error("Selecciona dos cuentas diferentes.");
  }

  if (
    amount === "" ||
    amount == null ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 0.00001
  ) {
    throw new Error("Ingresa un importe válido de hasta dos decimales.");
  }

  if (!transferDate) {
    throw new Error("Selecciona la fecha de transferencia.");
  }

  if (!requestId) {
    throw new Error("Falta el identificador único de la operación.");
  }

  const { data, error } = await supabase.rpc(
    "register_account_transfer",
    {
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_amount: parsedAmount,
      p_transfer_date: transferDate,
      p_description: description.trim() || null,
      p_request_id: requestId,
    }
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data;
}

export async function reverseAccountTransfer(transferId) {
  await getCurrentUser();

  if (!transferId) {
    throw new Error("Selecciona una transferencia válida.");
  }

  const { error } = await supabase.rpc(
    "reverse_account_transfer",
    {
      p_transfer_id: transferId,
    }
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return true;
}
