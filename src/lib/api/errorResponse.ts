import { NextResponse } from "next/server";

/**
 * Centralised API error responses. Detailed errors (DB messages, stack traces,
 * Stripe codes, constraint names) stay in the server log; the browser gets a
 * generic message chosen by status. Response shape matches the rest of VSN:
 * { ok: false, error, code? }.
 */
const GENERIC_BY_STATUS: Record<number, string> = {
  400: "That request couldn't be processed. Please check what you entered and try again.",
  401: "Please sign in to continue.",
  402: "Your account needs a billing update before you can do that.",
  403: "You don't have access to that.",
  404: "We couldn't find that.",
  409: "That action couldn't be completed right now.",
  413: "That file is too large.",
  422: "Something about that submission isn't valid. Please review and try again.",
  429: "Too many attempts in a short time. Wait a minute, then try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "We're having trouble reaching a service. Please try again.",
  503: "That service isn't available right now. Please try again shortly.",
};

type Ctx = { route?: string; status?: number; code?: string; publicMessage?: string; extra?: Record<string, unknown> };

export function serverError(err: unknown, ctx: Ctx = {}): NextResponse {
  const status = ctx.status ?? 500;
  const route = ctx.route ?? "(unknown route)";
  const summary = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { value: err };
  console.error(`[api:error] ${route} (${status})`, { err: summary, ...(ctx.extra ?? {}) });
  const publicMessage = ctx.publicMessage ?? GENERIC_BY_STATUS[status] ?? GENERIC_BY_STATUS[500];
  return NextResponse.json({ ok: false, error: publicMessage, ...(ctx.code ? { code: ctx.code } : {}) }, { status });
}

function looksInternal(s: string): boolean {
  const l = s.toLowerCase();
  return (
    l.includes("constraint") ||
    l.includes("violation") ||
    l.includes("duplicate key") ||
    l.includes("foreign key") ||
    l.includes('relation "') ||
    l.includes('column "') ||
    /^[A-Z]\w+Error:\s/.test(s)
  );
}

export function clientError(publicMessage: string, ctx: Omit<Ctx, "publicMessage"> = {}): NextResponse {
  const status = ctx.status ?? 400;
  const safe = looksInternal(publicMessage) ? (GENERIC_BY_STATUS[status] ?? GENERIC_BY_STATUS[400]) : publicMessage;
  if (ctx.route) console.warn(`[api:client] ${ctx.route} (${status}) ${safe}`, ctx.extra ?? {});
  return NextResponse.json({ ok: false, error: safe, ...(ctx.code ? { code: ctx.code } : {}) }, { status });
}

export const apiError = {
  badRequest: (msg = GENERIC_BY_STATUS[400], route?: string) => clientError(msg, { status: 400, route }),
  unauthorized: (route?: string) => clientError(GENERIC_BY_STATUS[401], { status: 401, route }),
  forbidden: (route?: string) => clientError(GENERIC_BY_STATUS[403], { status: 403, route }),
  notFound: (route?: string) => clientError(GENERIC_BY_STATUS[404], { status: 404, route }),
  validation: (msg = GENERIC_BY_STATUS[422], route?: string) => clientError(msg, { status: 422, route }),
  rateLimited: (route?: string, retryAfterSec?: number) => {
    const res = clientError(GENERIC_BY_STATUS[429], { status: 429, route, code: "ratelimited" });
    if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  },
};
