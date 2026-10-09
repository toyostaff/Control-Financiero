
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
    throw new Error("Debes iniciar sesión para administrar tus cuentas.");
  }

  return user;
}

export async function getAccounts() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("accounts")
    .select("id, user_id, name, type, balance, active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data || []).map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: Number(account.balance),
    active: account.active,
  }));
}

export async function createAccount(account) {
  const user = await getCurrentUser();

  const name = String(account.name || "").trim();
  const type = String(account.type || "").trim();
  const balance = Number(account.balance);

  if (!name || !type) {
    throw new Error("Completa el nombre y el tipo de cuenta.");
  }

  if (
    account.balance === "" ||
    account.balance == null ||
    !Number.isFinite(balance) ||
    balance < 0 ||
    Math.abs(balance * 100 - Math.round(balance * 100)) > 0.00001
  ) {
    throw new Error("El saldo debe ser un importe válido de hasta dos decimales.");
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      type,
      balance,
      active: true,
    })
    .select("id, name, type, balance, active")
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return {
    ...data,
    balance: Number(data.balance),
  };
}

export async function setAccountActive(accountId, active) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("accounts")
    .update({ active: Boolean(active) })
    .eq("id", accountId)
    .eq("user_id", user.id)
    .select("id, name, type, balance, active")
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return {
    ...data,
    balance: Number(data.balance),
  };
}

export async function removeAccount(accountId) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data;
}
