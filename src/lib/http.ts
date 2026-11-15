import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "./env";

export function jsonError(status: number, error: string, message?: string): NextResponse {
  return NextResponse.json({ error, message: message ?? error }, { status });
}

/** Absolute base URL of the app: APP_URL (or NEXT_PUBLIC_APP_URL), else derived from the request. */
export async function appUrl(): Promise<string> {
  if (env.appUrl) return env.appUrl.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Simple in-memory limiter (per serverless instance) — enough to slow PIN guessing at this scale.
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
}
