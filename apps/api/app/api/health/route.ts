import { NextResponse } from "next/server";
import { pingDb } from "@calorielog/db";
import { serverEnv } from "@/lib/env";

const APP_VERSION = "0.0.1";

export async function GET() {
  const dbUrl = serverEnv.databaseUrl;

  if (!dbUrl) {
    return NextResponse.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      environment: serverEnv.apiEnv,
      database: {
        connected: false,
        error: "DATABASE_URL is not configured",
      },
    });
  }

  const start = Date.now();
  let dbConnected = false;
  let dbLatencyMs: number | undefined;
  let dbError: string | undefined;

  try {
    await pingDb(dbUrl);
    dbConnected = true;
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Connection failed";
    console.error("[health] Database ping failed:", err);
  }

  return NextResponse.json({
    status: dbConnected ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: serverEnv.apiEnv,
    database: {
      connected: dbConnected,
      ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
      ...(dbError !== undefined && { error: dbError }),
    },
  });
}
