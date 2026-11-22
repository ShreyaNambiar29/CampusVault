import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
export default async function Home() {
  const s = await session();
  redirect(s ? `/${s.profile.role}/dashboard` : "/login");
}
