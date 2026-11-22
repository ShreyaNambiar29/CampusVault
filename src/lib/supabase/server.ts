import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
export const configured = () => {
  const { url, key } = supabaseConfig();
  return Boolean(url && key);
};
export async function supabase() {
  if (!configured())
    throw new Error(
      "Supabase is not configured. Follow the setup instructions in README.md.",
    );
  const jar = await cookies();
  return createServerClient(supabaseConfig().url!, supabaseConfig().key!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components refresh cookies through proxy. */
        }
      },
    },
  });
}
