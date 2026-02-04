import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

export const AVATAR_BUCKET = (import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars").trim() || "avatars";

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
};
