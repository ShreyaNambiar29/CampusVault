"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
export function createClient() {
  const { url, key } = supabaseConfig();
  if (!url || !key)
    throw new Error("Supabase public configuration is missing.");
  return createBrowserClient(url, key);
}
