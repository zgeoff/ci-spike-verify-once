// The record key: refs/ci-pass/<tree>/<check>-<toolchain>. Every pinned input (bun.lock,
// package.json, configs, .bun-version, the workflow) is already inside <tree>; <toolchain> holds
// only what lives outside the tree and that CI can compute without installing anything.
import { createHash } from "node:crypto";
import { arch, platform } from "node:os";

export const KEY_SCHEMA = "v1"; // bump to invalidate every record (check-set change, key bug)
export const CHECKS = { lint: { platformSensitive: false }, test: { platformSensitive: true } } as const;
export type Check = keyof typeof CHECKS;

export function toolchainHash(check: Check, declaredBun: string): string {
  const plat = CHECKS[check].platformSensitive ? `${platform()}-${arch()}` : "any";
  const input = `${KEY_SCHEMA}\nbun=${declaredBun}\nplatform=${plat}\n`;
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export function recordRef(tree: string, check: Check, declaredBun: string): string {
  return `refs/ci-pass/${tree}/${check}-${toolchainHash(check, declaredBun)}`;
}
