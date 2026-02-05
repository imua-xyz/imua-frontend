/**
 * Global test setup for Vitest.
 * - Sets env vars required by app modules (e.g. types/tokens -> types/networks).
 * - Clears optimistic cache store between tests to avoid leakage.
 */
import { afterEach } from "vitest";
import { useOptimisticCacheStore } from "@/stores/optimisticCacheStore";

process.env.NEXT_PUBLIC_BEACON_API_URL = process.env.NEXT_PUBLIC_BEACON_API_URL || "https://beacon.example.com";

afterEach(() => {
  useOptimisticCacheStore.getState().clearAll();
});
