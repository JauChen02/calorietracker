import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

const APP_VERSION = "0.0.1";
const API_VERSION = "v1";

export function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    apiVersion: API_VERSION,
    environment: serverEnv.apiEnv,
  });
}
