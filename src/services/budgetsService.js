
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

function validateLimit(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    throw new Error("Ingresa un límite válido.");
  }

  const limit = Number(value);

  if (
    !Number.isFinite(limit) ||
    limit <= 0 ||
    Math.abs(limit * 100 - Math.round(limit * 100)) > 0.00001
  ) {
    throw new Error(
      "El límite debe ser mayor que cero y tener hasta dos decimales."
    );
  }

  return Math.round(limit * 100) / 100;
}

function mapBudget(item) {
  return {
    id: item.id,
    category: item.category,
    limit: Number(item.limit),
  };
}

export async function getBudgets() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("budgets")
    .select("id, category, limit")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapBudget);
}

export async function createBudget(budget) {
  const user = await getCurrentUser();

  const category = String(budget.category || "").trim();
  const limit = validateLimit(budget.limit);

  if (!category) {
    throw new Error("Selecciona una categoría.");
  }

  const { data: categoryData, error: categoryError } =
    await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", category)
      .eq("type", "expense")
      .eq("active", true)
      .limit(1);

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (!categoryData || categoryData.length === 0) {
    throw new Error(
      "Selecciona una categoría de gasto activa."
    );
  }

  const existingBudgets = await getBudgets();

  const exists = existingBudgets.some(
    (item) =>
      item.category.toLowerCase() === category.toLowerCase()
  );

  if (exists) {
    throw new Error(
      "Ya existe un presupuesto para esta categoría."
    );
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      category,
      limit,
    })
    .select("id, category, limit")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapBudget(data);
}

export async function removeBudget(budgetId) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


