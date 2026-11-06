#!/usr/bin/env bash
# Smoke test for a running Metamorph MCP server. Needs only bash, curl and jq.
#
# Usage:
#   METAMORPH_URL=https://<host> scripts/smoke.sh            # public checks only
#   METAMORPH_URL=https://<host> METAMORPH_KEY=<key> scripts/smoke.sh   # also the authenticated checks
#
# METAMORPH_URL  required. Server origin, with or without a trailing /mcp (for local: http://localhost:3190).
# METAMORPH_KEY  optional. Read from the environment only, never printed. With a write-scope key every
#                authenticated check runs; a lower scope fails the checks that need more and says so.
# Checks that call GitHub or the OSV/CISA/EPSS feeds need outbound network from the server. Exit code 0 only if all run checks pass.
set -u

: "${METAMORPH_URL:?set METAMORPH_URL to the server origin, for example http://localhost:3190}"
BASE="${METAMORPH_URL%/}"
BASE="${BASE%/mcp}"
MCP="$BASE/mcp"
KEY="${METAMORPH_KEY:-}"
REPO="https://github.com/dhilipa01/metamorph-demo-legacy"
SUB="php-shop"
EXPECTED_TOOLS="analyze_advisory assess_project plan_modernization preview_changes apply_stage check_watch generate_report verify_patch cloud_inventory"

command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NAMES=(); RESULTS=(); DETAILS=()
record() { NAMES+=("$1"); RESULTS+=("$2"); DETAILS+=("$3"); }

# rpc <id> <json-body> [auth]: POST a JSON-RPC message, print the JSON reply (the server answers JSON or SSE).
rpc() {
  local id="$1" body="$2" auth="${3:-}" out
  local args=(-s -m 120 -X POST "$MCP" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream')
  if [ -n "$auth" ] && [ -n "$KEY" ]; then args+=(-H "Authorization: Bearer $KEY"); fi
  out="$(curl "${args[@]}" -d "$body")" || return 1
  if printf '%s' "$out" | grep -q '^data:'; then
    printf '%s\n' "$out" | sed -n 's/^data: *//p' | head -n 1
  else
    printf '%s' "$out"
  fi
}
call_body() { # <id> <tool> <arguments-json>
  jq -cn --argjson id "$1" --arg name "$2" --argjson args "$3" \
    '{jsonrpc:"2.0",id:$id,method:"tools/call",params:{name:$name,arguments:$args}}'
}
text_of() { jq -r '[.result.content[]? | select(.type=="text") | .text] | join("\n")'; }

# ---------------------------------------------------------------- public checks
code="$(curl -s -m 20 -o /dev/null -w '%{http_code}' "$MCP/health")"
if [ "$code" = "200" ]; then record "health (GET /mcp/health)" PASS "HTTP 200"; else record "health (GET /mcp/health)" FAIL "HTTP $code"; fi

list="$(rpc 1 '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>/dev/null)"
got="$(printf '%s' "$list" | jq -r '[.result.tools[]?.name] | sort | join(" ")' 2>/dev/null)"
want="$(printf '%s\n' $EXPECTED_TOOLS | sort | tr '\n' ' ' | sed 's/ $//')"
count="$(printf '%s' "$list" | jq -r '.result.tools | length' 2>/dev/null)"
if [ "$count" = "9" ] && [ "$got" = "$want" ]; then
  record "tools/list returns the 9 tools by name" PASS "9 tools"
else
  record "tools/list returns the 9 tools by name" FAIL "count=${count:-none}; got: ${got:-nothing}"
fi

anon="$(rpc 2 "$(call_body 2 check_watch '{"products":"php"}')" 2>/dev/null)"
anon_text="$(printf '%s' "$anon" | text_of 2>/dev/null)"
anon_err="$(printf '%s' "$anon" | jq -r '.result.isError // false' 2>/dev/null)"
if [ "$anon_err" = "true" ] && printf '%s' "$anon_text" | grep -q '401: Missing API key'; then
  record "tools/call without a key gives the 401 text" PASS "401: Missing API key"
elif [ "$anon_err" != "true" ] && printf '%s' "$BASE" | grep -Eq '^https?://(localhost|127\.0\.0\.1|\[::1\])(:|/|$)'; then
  record "tools/call without a key gives the 401 text" SKIP "local server accepts keyless calls (METAMORPH_AUTH=off)"
elif [ "$anon_err" != "true" ]; then
  record "tools/call without a key gives the 401 text" FAIL "call succeeded without a key on a non-local host: auth is OFF"
else
  record "tools/call without a key gives the 401 text" FAIL "${anon_text:-no reply}"
fi

# ---------------------------------------------------------------- authenticated checks
if [ -z "$KEY" ]; then
  for n in "assess_project on php-shop" "check_watch" "generate_report" "report PDF download" "bogus approval token refused"; do
    record "$n" SKIP "METAMORPH_KEY not set"
  done
else
  start="$(date +%s.%N)"
  r="$(rpc 3 "$(call_body 3 assess_project "$(jq -cn --arg u "$REPO" --arg s "$SUB" '{repo_url:$u,subfolder:$s}')")" auth 2>/dev/null)"
  secs="$(awk -v a="$start" -v b="$(date +%s.%N)" 'BEGIN{printf "%.1f", b-a}')"
  err="$(printf '%s' "$r" | jq -r '.result.isError // false' 2>/dev/null)"
  sc="$(printf '%s' "$r" | jq -r '.result.structuredContent.score.overall // empty' 2>/dev/null)"
  if [ -z "$sc" ]; then sc="$(printf '%s' "$r" | text_of | jq -r '.score.overall // empty' 2>/dev/null)"; fi
  if [ "$err" != "true" ] && [ -n "$sc" ]; then
    record "assess_project on php-shop" PASS "score $sc in ${secs}s"
  else
    record "assess_project on php-shop" FAIL "$(printf '%s' "$r" | text_of 2>/dev/null | head -c 200) (${secs}s)"
  fi

  r="$(rpc 4 "$(call_body 4 check_watch '{"cve_ids":["CVE-2021-44228"],"products":["php@8.1"]}')" auth 2>/dev/null)"
  err="$(printf '%s' "$r" | jq -r '.result.isError // false' 2>/dev/null)"
  body="$(printf '%s' "$r" | jq -c '.result.structuredContent // empty' 2>/dev/null)"
  if [ -z "$body" ]; then body="$(printf '%s' "$r" | text_of 2>/dev/null)"; fi
  if [ "$err" != "true" ] && printf '%s' "$body" | jq -e 'has("kevHits") and has("eol")' >/dev/null 2>&1; then
    unav="$(printf '%s' "$body" | jq -r '(.unavailable // []) | length')"
    record "check_watch" PASS "kevHits and eol present; unavailable feeds: $unav"
  else
    record "check_watch" FAIL "$(printf '%s' "$r" | text_of 2>/dev/null | head -c 200)"
  fi

  r="$(rpc 5 "$(call_body 5 generate_report "$(jq -cn --arg u "$REPO" --arg s "$SUB" '{repo_url:$u,subfolder:$s}')")" auth 2>/dev/null)"
  err="$(printf '%s' "$r" | jq -r '.result.isError // false' 2>/dev/null)"
  body="$(printf '%s' "$r" | jq -c '.result.structuredContent // empty' 2>/dev/null)"
  if [ -z "$body" ]; then body="$(printf '%s' "$r" | text_of 2>/dev/null)"; fi
  url="$(printf '%s' "$body" | jq -r '[.files[]? | select(.format=="pdf") | .downloadUrl][0] // empty' 2>/dev/null)"
  nfiles="$(printf '%s' "$body" | jq -r '.files | length' 2>/dev/null)"
  if [ "$err" = "true" ] || [ -z "$url" ]; then
    record "generate_report" FAIL "$(printf '%s' "$r" | text_of 2>/dev/null | head -c 200) (downloadUrl missing: set METAMORPH_TOKEN_SECRET)"
    record "report PDF download" SKIP "no link from generate_report"
  else
    record "generate_report" PASS "$nfiles files returned"
    case "$url" in /*) url="$BASE$url" ;; esac
    hdr="$(curl -s -m 60 -D "$TMP/h" -o "$TMP/report.pdf" -w '%{http_code}' "$url")"
    ctype="$(grep -i '^content-type:' "$TMP/h" | tr -d '\r' | head -n 1 | sed 's/^[^:]*: *//')"
    magic="$(head -c 5 "$TMP/report.pdf" 2>/dev/null)"
    if [ "$hdr" = "200" ] && printf '%s' "$ctype" | grep -qi '^application/pdf' && [ "$magic" = "%PDF-" ]; then
      record "report PDF download" PASS "HTTP 200, $ctype, starts with %PDF, $(wc -c < "$TMP/report.pdf" | tr -d ' ') bytes"
    else
      record "report PDF download" FAIL "HTTP $hdr, content-type '${ctype:-none}', first bytes '$(printf '%s' "$magic" | tr -c '[:print:]' '?')'"
    fi
  fi

  args="$(jq -cn --arg u "$REPO" --arg s "$SUB" '{repo_url:$u,subfolder:$s,stage:"patch-dependencies",goal:"patch_advisory",approval_token:"bogus.token"}')"
  r="$(rpc 6 "$(call_body 6 apply_stage "$args")" auth 2>/dev/null)"
  err="$(printf '%s' "$r" | jq -r '.result.isError // false' 2>/dev/null)"
  msg="$(printf '%s' "$r" | text_of 2>/dev/null)"
  applied="$(printf '%s' "$r" | jq -r '.result.structuredContent.applied // empty' 2>/dev/null)"
  if [ "$err" = "true" ] && [ "$applied" != "true" ] && printf '%s' "$msg" | grep -qi 'token'; then
    record "bogus approval token refused" PASS "$(printf '%s' "$msg" | head -c 110)"
  elif printf '%s' "$msg" | grep -q '403'; then
    record "bogus approval token refused" FAIL "key lacks write scope (403); use a write key to test the token check"
  else
    record "bogus approval token refused" FAIL "$(printf '%s' "$msg" | head -c 200)"
  fi
fi

# ---------------------------------------------------------------- table
pass=0; fail=0; skip=0
echo
printf '%-46s %-5s %s\n' "CHECK" "RESULT" "DETAIL"
printf '%-46s %-5s %s\n' "----------------------------------------------" "-----" "------"
for i in "${!NAMES[@]}"; do
  printf '%-46s %-6s %s\n' "${NAMES[$i]}" "${RESULTS[$i]}" "${DETAILS[$i]}"
  case "${RESULTS[$i]}" in PASS) pass=$((pass+1)) ;; FAIL) fail=$((fail+1)) ;; *) skip=$((skip+1)) ;; esac
done
echo
echo "PASS: $pass  FAIL: $fail  SKIP: $skip"
if [ "$fail" -eq 0 ]; then echo "OVERALL: PASS"; exit 0; else echo "OVERALL: FAIL"; exit 1; fi
