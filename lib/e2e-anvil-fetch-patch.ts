import { patchE2eAnvilRpcExchange } from "@/lib/e2e-anvil-rpc-patch";

/**
 * Viem's public client uses global `fetch` → `/api/e2e-anvil` (not the EIP-1193 connector).
 * Patch JSON-RPC responses after fetch so `result: null` from Anvil never reaches viem.
 */
export function installE2EAnvilFetchPatch(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __e2eAnvilFetchPatched?: boolean };
  if (w.__e2eAnvilFetchPatched) return;
  w.__e2eAnvilFetchPatched = true;

  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const isOurRpc =
      url.includes("/api/e2e-anvil") &&
      (init?.method ?? (input instanceof Request ? input.method : "GET")) ===
        "POST";

    let reqParsed: unknown = {};
    if (isOurRpc) {
      try {
        if (init?.body != null && typeof init.body === "string") {
          reqParsed = JSON.parse(init.body);
        } else if (input instanceof Request) {
          reqParsed = JSON.parse(await input.clone().text());
        }
      } catch {
        /* leave {} */
      }
    }

    const res = await orig(input, init);
    if (!isOurRpc) return res;

    const text = await res.text();
    try {
      const resParsed = JSON.parse(text);
      const patched = patchE2eAnvilRpcExchange(reqParsed, resParsed);
      return new Response(JSON.stringify(patched), {
        status: res.status,
        headers: res.headers,
      });
    } catch {
      return new Response(text, {
        status: res.status,
        headers: res.headers,
      });
    }
  };
}
