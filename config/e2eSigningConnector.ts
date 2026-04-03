/**
 * E2E-only connector that signs transactions with the test account and sends
 * them to the RPC (proxied to Anvil in Playwright). Use when E2E tests need
 * real stake/delegate/undelegate/claim/withdraw tx submission.
 */
import { createConnector, ChainNotConfiguredError } from "@wagmi/core";
import type { Address, EIP1193RequestFn, Hex } from "viem";
import {
  createWalletClient,
  custom,
  fromHex,
  getAddress,
  numberToHex,
  RpcRequestError,
  SwitchChainError,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { rpc } from "viem/utils";
import { hoodi } from "./wagmi";

const TEST_EVM_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const account = privateKeyToAccount(TEST_EVM_PRIVATE_KEY as `0x${string}`);
const accounts = [account.address] as readonly [Address, ...Address[]];

export const E2E_SIGNING_CONNECTOR_ID = "e2e-signing-mock";

function createE2ESigningConnector() {
  let connected = false;
  let connectedChainId: number = hoodi.id;

  return createConnector((config) => ({
    id: E2E_SIGNING_CONNECTOR_ID,
    name: "E2E Signing Mock",
    type: "e2e-signing-mock",
    async setup() {
      connectedChainId = config.chains[0].id;
    },
    async connect({ chainId } = {}) {
      const provider = (await this.getProvider()) as {
        request: (args: {
          method: string;
          params?: unknown;
        }) => Promise<unknown>;
      };
      const accts = await provider.request({
        method: "eth_requestAccounts",
      });
      let currentChainId = await this.getChainId();
      if (chainId != null && currentChainId !== chainId) {
        const chain = await this.switchChain!({ chainId });
        currentChainId = chain.id;
      }
      connected = true;
      return {
        accounts: (accts as string[]).map((x) => getAddress(x)),
        chainId: currentChainId,
      };
    },
    async disconnect() {
      connected = false;
    },
    async getAccounts() {
      if (!connected) throw new Error("Connector not connected");
      return accounts;
    },
    async getChainId() {
      return connectedChainId;
    },
    async isAuthorized() {
      return connected && accounts.length > 0;
    },
    async switchChain({ chainId }) {
      const chain = config.chains.find((c) => c.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());
      connectedChainId = chainId;
      this.onChainChanged(chainId.toString());
      return chain;
    },
    onAccountsChanged(accts: string[]) {
      if (accts.length === 0) this.onDisconnect();
    },
    onChainChanged(chainId: string) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },
    onDisconnect() {
      config.emitter.emit("disconnect");
      connected = false;
    },
    async getProvider({ chainId } = {}) {
      const chain =
        config.chains.find((c) => c.id === (chainId ?? connectedChainId)) ??
        config.chains[0];
      const url = chain.rpcUrls.default.http[0]!;

      const request: EIP1193RequestFn = async ({ method, params }) => {
        if (method === "eth_chainId") return numberToHex(connectedChainId);
        if (method === "eth_requestAccounts") return accounts;

        if (method === "wallet_switchEthereumChain") {
          const [{ chainId: hexChainId }] = params as [{ chainId: Hex }];
          connectedChainId = fromHex(hexChainId, "number");
          this.onChainChanged(connectedChainId.toString());
          return undefined;
        }

        if (method === "eth_sendTransaction") {
          const [tx] = params as [Record<string, unknown>];
          const walletClient = createWalletClient({
            account,
            chain,
            transport: custom({ request: async () => null }),
          });
          const signed = await walletClient.signTransaction({
            account,
            chain,
            ...tx,
          });
          const { result, error } = await rpc.http(url, {
            body: {
              method: "eth_sendRawTransaction",
              params: [signed],
            },
          });
          if (error)
            throw new RpcRequestError({
              body: { method, params },
              error,
              url,
            });
          return result;
        }

        const body = { method, params };
        const { error, result } = await rpc.http(url, { body });
        if (error) throw new RpcRequestError({ body, error, url });
        return result;
      };

      return custom({ request })({ retryCount: 0 });
    },
  }));
}

export function createE2ESigningConnectorInstance() {
  return createE2ESigningConnector() as ReturnType<typeof createConnector>;
}
