import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, verifyAdminBearerToken } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const PROTOCOL_VERSION = "2025-11-25";

const TOOLS = [
  {
    name: "growth_overview",
    title: "StoryLoop growth overview",
    description: "Read current signups, activation, plans, revenue, traffic, referrals, and 30-day product health.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "recent_signups",
    title: "Recent StoryLoop signups",
    description: "List recent non-internal accounts with plan, subscription status, acquisition source, activation, and last activity.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
        plan: { type: "string", enum: ["free", "educator", "educator_pro", "centre_starter", "centre_growth"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "product_health",
    title: "StoryLoop product health",
    description: "Read story quality, Today Loop usage, and review moderation counts for a bounded time window.",
    inputSchema: {
      type: "object",
      properties: { days: { type: "integer", minimum: 1, maximum: 365, default: 30 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "review_queue",
    title: "StoryLoop review queue",
    description: "List pending educator reviews awaiting an admin decision. This tool cannot publish or delete them.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
] as const;

function jsonRpc(id: JsonRpcRequest["id"], result: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result }, { status });
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string, status = 200) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  }, { status });
}

function textToolResult(value: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
    isError: false,
  };
}

function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (url.host === request.nextUrl.host) return true;
    if (url.protocol === "https:" && (url.hostname === "storyloop.space" || url.hostname === "www.storyloop.space")) return true;
    return false;
  } catch {
    return false;
  }
}

async function authorised(request: NextRequest) {
  const cookieAdmin = await verifyAdmin();
  if (cookieAdmin) return cookieAdmin;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return verifyAdminBearerToken(header.slice(7).trim());
}

function boundedInteger(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, max));
}

async function callTool(name: unknown, args: Record<string, unknown>) {
  const admin = createAdminSupabase();

  if (name === "growth_overview") {
    const [{ data: growth, error: growthError }, { data: health, error: healthError }] = await Promise.all([
      admin.rpc("admin_dashboard_metrics"),
      admin.rpc("admin_product_health", { p_days: 30 }),
    ]);
    if (growthError || healthError) throw new Error(growthError?.message ?? healthError?.message ?? "Could not load metrics");
    return textToolResult({ growth, product_health: health });
  }

  if (name === "recent_signups") {
    const limit = boundedInteger(args.limit, 25, 100);
    const plan = typeof args.plan === "string" ? args.plan : "";
    let query = admin
      .from("profiles")
      .select("id, email, full_name, plan, subscription_status, total_stories, stories_this_month, signup_source, signup_campaign, signup_referrer_host, created_at, last_seen_at, last_story_at")
      .eq("is_internal", false)
      .not("email", "like", "qa-%")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (plan) query = query.eq("plan", plan);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return textToolResult({ accounts: data ?? [], count: data?.length ?? 0 });
  }

  if (name === "product_health") {
    const days = boundedInteger(args.days, 30, 365);
    const { data, error } = await admin.rpc("admin_product_health", { p_days: days });
    if (error) throw new Error(error.message);
    return textToolResult(data);
  }

  if (name === "review_queue") {
    const limit = boundedInteger(args.limit, 25, 100);
    const { data, error } = await admin
      .from("reviews")
      .select("id, reviewer_name, reviewer_role, rating, body, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return textToolResult({ reviews: data ?? [], count: data?.length ?? 0 });
  }

  throw new Error("Unknown tool");
}

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) {
    return jsonRpcError(null, -32001, "Forbidden origin", 403);
  }

  const admin = await authorised(request);
  if (!admin) {
    return new NextResponse(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unauthorized" } }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Bearer realm="StoryLoop MCP"',
        },
      }
    );
  }

  const body = await request.json().catch(() => null) as JsonRpcRequest | null;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonRpcError(body?.id, -32600, "Invalid Request", 400);
  }

  const headerMethod = request.headers.get("mcp-method");
  if (headerMethod && headerMethod !== body.method) {
    return jsonRpcError(body.id, -32600, "Mcp-Method header does not match the request", 400);
  }

  if (body.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }
  if (body.method === "initialize") {
    return jsonRpc(body.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: {
        name: "storyloop-admin",
        title: "StoryLoop Admin Analytics",
        version: "1.0.0",
        description: "Read-only operational analytics for StoryLoop.",
      },
      instructions: "Use these read-only tools to inspect growth, plan mix, traffic, story quality, Today Loop usage, and the review queue.",
    });
  }
  if (body.method === "ping") {
    return jsonRpc(body.id, {});
  }
  if (body.method === "tools/list") {
    return jsonRpc(body.id, { tools: TOOLS });
  }
  if (body.method === "tools/call") {
    const name = body.params?.name;
    const headerName = request.headers.get("mcp-name");
    if (headerName && headerName !== name) {
      return jsonRpcError(body.id, -32602, "Mcp-Name header does not match the request", 400);
    }
    try {
      const args = body.params?.arguments && typeof body.params.arguments === "object"
        ? body.params.arguments as Record<string, unknown>
        : {};
      const result = await callTool(name, args);
      return jsonRpc(body.id, result);
    } catch (error) {
      return jsonRpc(body.id, {
        content: [{ type: "text", text: error instanceof Error ? error.message : "Tool failed" }],
        isError: true,
      });
    }
  }

  return jsonRpcError(body.id, -32601, "Method not found");
}

export async function GET() {
  return NextResponse.json(
    { error: "StoryLoop MCP uses authenticated Streamable HTTP POST requests." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
