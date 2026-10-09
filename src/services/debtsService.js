import { supabase } from "../lib/supabase";

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Debes iniciar sesión.");
  }

  return user;
}

function validateAmount(value, label = "importe") {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`Ingresa un ${label} válido.`);
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
  ) {
    throw new Error(
      `El ${label} debe ser mayor que cero y tener hasta dos decimales.`
    );
  }

  return Math.round(amount * 100) / 100;
}

function mapDebt(debt) {
  return {
    id: debt.id,
    name: debt.name,
    type: debt.type,
    initialAmount: Number(debt.initial_amount),
    balance: Number(debt.balance),
    monthlyPayment: Number(debt.monthly_payment),
    dueDay: Number(debt.due_day),
    singlePayment: debt.single_payment,
    mode: debt.mode,
    closedAt: debt.closed_at,
    forgivenAmount: Number(debt.forgiven_amount || 0),
    createdAt: debt.created_at,
  };
}

function mapPayment(payment) {
  return {
    id: payment.id,
    debtId: payment.debt_id,
    accountId: payment.account_id,
    debtName: payment.debt_name,
    accountName: payment.account_name,
    amount: Number(payment.amount),
    principal: Number(payment.principal),
    interest: Number(payment.interest),
    date: payment.date,
    mode: payment.mode,
    createdAt: payment.created_at,
  };
}

export async function getDebts(mode = "real") {
  const user = await getCurrentUser();

  if (!["real", "test"].includes(mode)) {
    throw new Error("Modo de deuda inválido.");
  }

  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map(mapDebt);
}

export async function getDebtPayments(mode = "real") {
  const user = await getCurrentUser();

  if (!["real", "test"].includes(mode)) {
    throw new Error("Modo de deuda inválido.");
  }

  const { data, error } = await supabase
    .from("debt_payments")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(mapPayment);
}

export async function createDebt(values, mode = "real") {
  const user = await getCurrentUser();

  if (!["real", "test"].includes(mode)) {
    throw new Error("Modo de deuda inválido.");
  }

  const name = String(values.name || "").trim();
  const type = String(values.type || "").trim();
  const amount = validateAmount(values.amount, "saldo de deuda");
  const singlePayment = Boolean(values.singlePayment);

  const monthlyPayment = singlePayment
    ? amount
    : validateAmount(values.monthlyPayment, "cuota habitual");

  const dueDay = Number(values.dueDay);

  if (!name) {
    throw new Error("Ingresa el nombre de la deuda.");
  }

  if (!["university", "bank", "personal", "other"].includes(type)) {
    throw new Error("Selecciona un tipo de deuda válido.");
  }

  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error("El día de vencimiento debe estar entre 1 y 31.");
  }

  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: user.id,
      name,
      type,
      initial_amount: amount,
      balance: amount,
      monthly_payment: monthlyPayment,
      due_day: dueDay,
      single_payment: singlePayment,
      mode,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return mapDebt(data);
}

export async function registerDebtPayment(values, mode = "real") {
  if (mode !== "real") {
    throw new Error(
      "Los pagos simulados deben utilizar un servicio independiente."
    );
  }

  await getCurrentUser();

  const debtId = values.debtId;
  const accountId = values.accountId;
  const amount = validateAmount(values.amount);
  const date = values.date;

  if (!debtId || !accountId || !date) {
    throw new Error("Completa los datos del pago.");
  }

  const { data, error } = await supabase.rpc(
    "register_debt_payment",
    {
      p_debt_id: debtId,
      p_account_id: accountId,
      p_amount: amount,
      p_date: date,
    }
  );

  if (error) throw new Error(error.message);

  return data;
}

export async function deleteTestDebt(debtId) {
  await getCurrentUser();

  if (!debtId) {
    throw new Error("Selecciona una deuda simulada.");
  }

  const { data, error } = await supabase.rpc(
    "delete_test_debt",
    {
      p_debt_id: debtId,
    }
  );

  if (error) throw new Error(error.message);

  return data;
}

export async function registerTestDebtPayment(values) {
  await getCurrentUser();

  const debtId = values.debtId;
  const accountId = values.accountId;
  const amount = validateAmount(values.amount);
  const date = values.date;

  if (!debtId || !accountId || !date) {
    throw new Error("Completa los datos del pago simulado.");
  }

  const { data, error } = await supabase.rpc(
    "register_test_debt_payment",
    {
      p_debt_id: debtId,
      p_account_id: accountId,
      p_amount: amount,
      p_date: date,
    }
  );

  if (error) throw new Error(error.message);

  return data;
}

export async function reverseDebtPayment(paymentId, mode = "real") {
  await getCurrentUser();

  if (!paymentId) {
    throw new Error("Selecciona un pago.");
  }

  if (!["real", "test"].includes(mode)) {
    throw new Error("Modo de deuda inválido.");
  }

  const functionName =
    mode === "real"
      ? "reverse_debt_payment"
      : "reverse_test_debt_payment";

  const { data, error } = await supabase.rpc(functionName, {
    p_payment_id: paymentId,
  });

  if (error) throw new Error(error.message);

  return data;
}

export async function deleteDebtSafely(debtId) {
  await getCurrentUser();

  if (!debtId) {
    throw new Error("Selecciona una deuda real.");
  }

  const { data, error } = await supabase.rpc(
    "delete_debt_safely",
    {
      p_debt_id: debtId,
    }
  );

  if (error) throw new Error(error.message);

  return data;
}

export async function initializeDebtTestAccounts() {
  await getCurrentUser();

  const { data, error } = await supabase.rpc(
    "initialize_debt_test_accounts"
  );

  if (error) throw new Error(error.message);

  return data;
}

export async function getDebtTestAccounts() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("debt_test_accounts")
    .select("account_id, balance")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  return (data || []).map((item) => ({
    accountId: item.account_id,
    balance: Number(item.balance),
  }));
}

export async function resetDebtTestEnvironment() {
  await getCurrentUser();

  const { data, error } = await supabase.rpc(
    "reset_debt_test_environment"
  );

  if (error) throw new Error(error.message);

  return data;
}
export async function completeDebtEarly(debtId) {
  await getCurrentUser();

  if (!debtId) {
    throw new Error("Selecciona una deuda válida.");
  }

  const { error } = await supabase.rpc(
    "complete_debt_early",
    {
      p_debt_id: debtId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
