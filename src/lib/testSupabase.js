
import { supabase } from "./supabase";

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Error de conexión con Supabase:", error.message);
    return false;
  }

  console.log("Supabase respondió correctamente.", data);
  return true;
}
