"use client";

import { signOut } from "next-auth/react";

export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    await signOut({ callbackUrl: "/admin/login?reason=session_expired" });
  }
  return res;
}
