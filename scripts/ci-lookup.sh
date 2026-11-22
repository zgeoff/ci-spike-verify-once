#!/usr/bin/env bash
# CI side: decide per check whether a local green record covers this tree. 0 REST calls: one
# git ls-remote over the git protocol. Mirrors scripts/ci-key.ts (keep in sync, or run that with bun).
set -euo pipefail
merge_tree=$(git rev-parse 'HEAD^{tree}')
if [ "$EVENT" = pull_request ]; then head_tree=$(git rev-parse 'HEAD^2^{tree}'); else head_tree=$merge_tree; fi
echo "tree under test (HEAD): $merge_tree"
echo "PR head tree:           $head_tree"
[ "$merge_tree" = "$head_tree" ] && echo "merge tree == head tree" || echo "merge tree != head tree (base moved since the branch was cut)"
bun_v=$(git show "HEAD:.bun-version" | tr -d '[:space:]')
case "$(uname -m)" in x86_64) a=x64 ;; aarch64) a=arm64 ;; *) a=$(uname -m) ;; esac
plat="$(uname -s | tr '[:upper:]' '[:lower:]')-$a"
if [ "$EVENT" = schedule ] || [ "$EVENT" = workflow_dispatch ]; then
  echo "nightly/manual: ignore records, run everything"; echo "lint=miss" >>"$GITHUB_OUTPUT"; echo "test=miss" >>"$GITHUB_OUTPUT"; echo "all=miss" >>"$GITHUB_OUTPUT"; exit 0
fi
# a PR accepts the record of the tree the author verified; a push to main needs its own tree
key_tree=$head_tree
start=$(date +%s%N)
refs=$(git ls-remote origin "refs/ci-pass/$key_tree/*" | awk '{print $2}')
echo "ls-remote took $(( ($(date +%s%N) - start) / 1000000 )) ms; records: ${refs:-none}"
all=hit
for check in lint test; do
  if [ $check = test ]; then p=$plat; else p=any; fi
  tc=$(printf 'v1\nbun=%s\nplatform=%s\n' "$bun_v" "$p" | sha256sum | cut -c1-12)
  if grep -qx "refs/ci-pass/$key_tree/$check-$tc" <<<"$refs"; then s=hit; else s=miss; all=miss; fi
  echo "$check: $s (want $check-$tc)"; echo "$check=$s" >>"$GITHUB_OUTPUT"
done
echo "all=$all" >>"$GITHUB_OUTPUT"
