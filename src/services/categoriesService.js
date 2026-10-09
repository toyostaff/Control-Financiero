
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

function getErrorMessage(error) {
  return error?.message || "Ocurrió un error inesperado.";
}

export async function getCategories() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type, active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data || [];
}

export async function createCategory(category) {
  const user = await getCurrentUser();

  const name = String(category.name || "").trim();
  const type = String(category.type || "").trim();

  if (!name) {
    throw new Error("Ingresa el nombre de la categoría.");
  }

  if (!["income", "expense"].includes(type)) {
    throw new Error("Selecciona un tipo válido.");
  }

  const existingCategories = await getCategories();

  const exists = existingCategories.some(
    (item) =>
      item.type === type &&
      item.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    throw new Error("Esta categoría ya existe.");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name,
      type,
      active: true,
    })
    .select("id, name, type, active")
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data;
}

export async function setCategoryActive(categoryId, active) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("categories")
    .update({
      active: Boolean(active),
    })
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .select("id, name, type, active")
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data;
}

export async function removeCategory(categoryId) {
  const user = await getCurrentUser();

  const { data: category, error: categoryError } =
    await supabase
      .from("categories")
      .select("id, name, type")
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .single();

  if (categoryError) {
    throw new Error(getErrorMessage(categoryError));
  }

  const [transactionsResult, budgetsResult, savingsResult] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", category.name)
        .eq("type", category.type)
        .limit(1),

      category.type === "expense"
        ? supabase
            .from("budgets")
            .select("id")
            .eq("user_id", user.id)
            .eq("category", category.name)
            .limit(1)
        : Promise.resolve({ data: [], error: null }),

      category.type === "expense"
        ? supabase
            .from("savings_movements")
            .select("id")
            .eq("user_id", user.id)
            .eq("category", category.name)
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const result of [
    transactionsResult,
    budgetsResult,
    savingsResult,
  ]) {
    if (result.error) {
      throw new Error(getErrorMessage(result.error));
    }
  }

  if (
    transactionsResult.data.length > 0 ||
    budgetsResult.data.length > 0 ||
    savingsResult.data.length > 0
  ) {
    throw new Error(
      "Esta categoría tiene registros asociados. Desactívala en lugar de eliminarla."
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return true;
}
