export interface BootstrapStatus {
  isBootstrapped: boolean;
  spawnTime: number;
  offsetDuration: number;
  isLocked: boolean;
  phase: "pre-lock" | "locked" | "bootstrapped";
}
