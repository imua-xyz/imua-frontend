import { NextResponse } from "next/server";
import { patchE2eAnvilRpcExchange } from "@/lib/e2e-anvil-rpc-patch";

const ANVIL_JSON_RPC = "http://127.0.0.1:8545";

/**
 * Proxy JSON-RPC to local Anvil for E2E only. The browser cannot POST to :8545
 * from :3000 without CORS; wagmi uses this URL when NEXT_PUBLIC_E2E_MODE is true.
 * Patches known Anvil `null` results so viem's public client does not hit BigInt(null).
 */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.text();
  try {
    const res = await fetch(ANVIL_JSON_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();

    let out = text;
    try {
      const reqParsed: unknown = JSON.parse(body);
      const resParsed: unknown = JSON.parse(text);
      out = JSON.stringify(patchE2eAnvilRpcExchange(reqParsed, resParsed));
    } catch {
      /* pass through */
    }

    return new NextResponse(out, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `E2E Anvil proxy failed: ${msg}` },
      { status: 502 },
    );
  }
}
