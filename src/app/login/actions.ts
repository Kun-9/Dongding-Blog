"use server";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth";

/** 안전한 내부 경로만 허용 — `//evil.com` 같은 값으로 밖에 내보내지 않는다. */
function safeNext(value: unknown): string {
  return typeof value === "string" && /^\/[^/]/.test(value) ? value : "/studio";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/");
}
