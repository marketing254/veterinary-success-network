import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, requireOwner, isResponse, logAction } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { notifySignup } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  const { data, error } = await supabaseAdmin()
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await requireOwner();
  if (isResponse(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = clean(body.email, 200).toLowerCase();
  const fullName = clean(body.fullName, 160);
  const role = clean(body.role, 20) === "owner" ? "owner" : "admin";
  if (!EMAIL_RE.test(email) || !fullName) {
    return NextResponse.json({ ok: false, error: "Name and a valid email are required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("admin_users")
    .insert({ email, full_name: fullName, role })
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "That email is already an admin." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
  }

  // Create the matching Supabase auth user (codes only, no password). Ignore "already exists".
  const { error: authErr } = await supabaseAdmin().auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (authErr && !/already/i.test(authErr.message)) {
    console.error("auth user creation failed (create manually in Authentication → Users):", authErr.message);
  }

  await logAction(session.email, "admin_user", data!.id, "add", `${fullName} <${email}> as ${role}`);
  await notifySignup("admin added", { "Added by": session.email, Name: fullName, Email: email, Role: role });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(req: NextRequest) {
  const session = await requireOwner();
  if (isResponse(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const id = clean(body.id, 60);
  const action = clean(body.action, 20);
  if (!id || !["deactivate", "reactivate"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: target } = await db.from("admin_users").select("*").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  if (target.email.toLowerCase() === session.email.toLowerCase() && action === "deactivate") {
    return NextResponse.json({ ok: false, error: "You can't deactivate yourself." }, { status: 400 });
  }
  if (target.role === "owner" && action === "deactivate") {
    const { count } = await db
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("active", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ ok: false, error: "You can't deactivate the last active owner." }, { status: 400 });
    }
  }

  const { data, error } = await db
    .from("admin_users")
    .update({ active: action === "reactivate" })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });

  await logAction(session.email, "admin_user", id, action, target.email);
  return NextResponse.json({ ok: true, row: data });
}
