// pre-push: run the light checks and, when green on a clean tree, record the result on the remote.
import { $ } from "bun";
import { CHECKS, type Check, recordRef } from "./ci-key";

const remote = process.argv[2] ?? "origin";
const naive = process.env.SPIKE_NAIVE === "1"; // spike only: skip the clean-tree guard to show the gap
const lines = (await Bun.stdin.text()).trim().split("\n").filter(Boolean);
const head = (await $`git rev-parse HEAD`.text()).trim();
const declaredBun = (await Bun.file(".bun-version").text()).trim();

let record = true;
const why: string[] = [];
if (Bun.version !== declaredBun) { record = false; why.push(`bun ${Bun.version} != .bun-version ${declaredBun}`); }
const dirty = (await $`git status --porcelain --untracked-files=all`.text()).trim();
if (dirty && !naive) { record = false; why.push("working tree is dirty or has untracked files"); }

const shas = lines.map((l) => l.split(" ")[1]).filter((s) => !/^0+$/.test(s));
for (const sha of shas) if (sha !== head) { record = false; why.push(`pushing ${sha.slice(0, 7)}, not HEAD`); }

for (const check of Object.keys(CHECKS) as Check[]) {
  const r = await $`bun run check:${check}`.nothrow();
  if (r.exitCode !== 0) { console.error(`pre-push: ${check} failed`); process.exit(1); }
}
if (!record || shas.length === 0) { console.error(`pre-push: checks green, not recorded: ${why.join("; ") || "nothing pushed"}`); process.exit(0); }

const tree = (await $`git rev-parse ${head}^{tree}`.text()).trim();
const specs = (Object.keys(CHECKS) as Check[]).map((c) => `${head}:${recordRef(tree, c, declaredBun)}`);
await $`git push --no-verify --quiet ${remote} ${specs}`; // --no-verify: the inner push must not re-run this hook
console.error(`pre-push: recorded ${specs.length} green checks for tree ${tree.slice(0, 12)}`);
