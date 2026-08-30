import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect back to main application. Supabase client JS parses code/hash automatically on arrival.
  return NextResponse.redirect(new URL(next, request.url));
}
