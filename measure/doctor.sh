#!/usr/bin/env bash
set -uo pipefail

failed=0

fail() {
  printf 'FAIL: %s\n' "$1"
  failed=1
}

check_path() {
  local path=$1
  local kind=$2
  if [[ $kind == file && ! -f $path ]]; then
    fail "required file missing: $path"
  elif [[ $kind == directory && ! -d $path ]]; then
    fail "required directory missing: $path"
  fi
}

check_path measure/index.md file
check_path measure/tracks.md file
check_path measure/tracks directory

for root in measure/tracks measure/archive; do
  [[ -d $root ]] || continue
  for track_dir in "$root"/*; do
    [[ -d $track_dir ]] || continue
    for required in spec.md plan.md metadata.json; do
      [[ -f $track_dir/$required ]] || fail "missing $required in $track_dir"
    done
  done
done

if [[ -f measure/tracks.md ]]; then
  while IFS= read -r target; do
    [[ -d measure/${target#./measure/} ]] || fail "registry link target missing: $target"
  done < <(grep -oE '\./measure/(tracks|archive)/[A-Za-z0-9_-]+/' measure/tracks.md || true)

  while IFS= read -r target; do
    [[ -d measure/${target#./} ]] || fail "registry link target missing: $target"
  done < <(grep -oE '\./(tracks|archive)/[A-Za-z0-9_-]+/' measure/tracks.md || true)
fi

while IFS= read -r plan; do
  while IFS= read -r marker; do
    marker=${marker#- }
    case $marker in
      '[ ]'|'[~]'|'[x]'|'[b]') ;;
      *) fail "invalid plan task marker $marker in $plan" ;;
    esac
  done < <(grep -oE '^- \[[^]]*\]' "$plan" || true)
done < <(printf '%s\n' measure/tracks/*/plan.md measure/archive/*/plan.md)

if (( failed )); then
  exit 1
fi

printf 'PASS: Measure architectural checks passed.\n'
