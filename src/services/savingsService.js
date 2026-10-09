
import { supabase } from "../lib/supabase";

async function executeSavingsAction(action, values = {}) {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data, error } = await supabase.rpc("manage_savings", {
    p_action: action,
    p_goal_id: values.goalId ?? null,
    p_account_id: values.accountId ?? null,
    p_amount: values.amount ?? null,
    p_name: values.name ?? null,
    p_target: values.target ?? null,
    p_deadline: values.deadline ?? null,
    p_description: values.description ?? null,
    p_category: values.category ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
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

export async function getSavingsGoals() {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .select("id, name, target, saved, deadline")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((goal) => ({
    id: goal.id,
    name: goal.name,
    target: Number(goal.target),
    saved: Number(goal.saved),
    deadline: goal.deadline || "",
  }));
}

export async function createSavingsGoal(values) {
  const name = String(values.name || "").trim();
  const target = validateAmount(values.target, "objetivo");
  const deadline = values.deadline;

  if (!name) {
    throw new Error("Ingresa el nombre de la meta.");
  }

  if (!deadline) {
    throw new Error("Selecciona una fecha objetivo.");
  }

  return executeSavingsAction("create", {
    name,
    target,
    deadline,
  });
}

export async function contributeToSavingsGoal(
  goalId,
  amount,
  accountId
) {
  if (!goalId || !accountId) {
    throw new Error("Selecciona una meta y una cuenta de origen.");
  }

  return executeSavingsAction("contribute", {
    goalId,
    accountId,
    amount: validateAmount(amount),
  });
}

export async function returnSavingsToAccount(
  goalId,
  amount,
  accountId
) {
  if (!goalId || !accountId) {
    throw new Error("Selecciona una meta y una cuenta de destino.");
  }

  return executeSavingsAction("return", {
    goalId,
    accountId,
    amount: validateAmount(amount),
  });
}

export async function spendSavings(
  goalId,
  amount,
  description,
  category
) {
  const cleanDescription = String(description || "").trim();
  const cleanCategory = String(category || "").trim();

  if (!goalId || !cleanDescription || !cleanCategory) {
    throw new Error(
      "Selecciona una meta, indica la descripción y la categoría."
    );
  }

  return executeSavingsAction("spend", {
    goalId,
    amount: validateAmount(amount),
    description: cleanDescription,
    category: cleanCategory,
  });
}

export async function deleteSavingsGoal(goalId) {
  if (!goalId) {
    throw new Error("Selecciona una meta para eliminar.");
  }

  return executeSavingsAction("delete", {
    goalId,
  });
}
