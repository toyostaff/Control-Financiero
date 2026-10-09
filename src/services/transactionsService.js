
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
    throw new Error(
      "Debes iniciar sesión para administrar tus movimientos."
    );
  }

  return user;
}

function validateAmount(value) {
  if (value === "" || value === null || value === undefined) {
    throw new Error("Ingresa un importe válido.");
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
  ) {
    throw new Error(
      "El importe debe ser mayor que cero y tener hasta dos decimales."
    );
  }

  return Math.round(amount * 100) / 100;
}

function validateDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error("Selecciona una fecha válida.");
  }

  const date = new Date(`${value}T12:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Selecciona una fecha válida.");
  }

  return value;
}

function mapTransaction(item) {
  return {
    id: item.id,
    accountId: item.account_id,
    description: item.description,
    amount: Number(item.amount),
    category: item.category,
    type: item.type,
    date: item.date,
    createdAt: item.created_at,
  };
}

export async function getTransactions() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, account_id, description, amount, category, type, date, created_at"
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data || []).map(mapTransaction);
}

export async function createTransaction(transaction) {
  await getCurrentUser();

  const accountId = String(transaction.accountId || "").trim();
  const description = String(
    transaction.description || ""
  ).trim();
  const category = String(transaction.category || "").trim();
  const type = String(transaction.type || "").trim();

  if (!accountId || !description || !category) {
    throw new Error(
      "Completa la cuenta, descripción y categoría."
    );
  }

  if (!["income", "expense"].includes(type)) {
    throw new Error("Selecciona un tipo de movimiento válido.");
  }

  const amount = validateAmount(transaction.amount);
  const date = validateDate(transaction.date);

  const { data: transactionId, error } = await supabase.rpc(
    "register_financial_transaction",
    {
      p_account_id: accountId,
      p_description: description,
      p_amount: amount,
      p_category: category,
      p_type: type,
      p_date: date,
    }
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!transactionId) {
    throw new Error(
      "No se recibió la confirmación del movimiento."
    );
  }

  return {
    id: transactionId,
    accountId,
    description,
    amount,
    category,
    type,
    date,
  };
}


