#!/bin/bash
# API Coverage Tracking Script for 20i MCP Server
# This script counts all API endpoints and implemented tools

# --- Resolve the API spec (gitignored; newest copy wins) -------------------
# The spec lives in archive/gitignor_ref_folder/ and is NOT committed to git,
# so fresh clones will not have it. Pick the newest 20i_api_doc*.apib present.
API_SPEC=$(ls -t archive/gitignor_ref_folder/20i_api_doc*.apib 2>/dev/null | head -1)

if [ -z "$API_SPEC" ] || [ ! -f "$API_SPEC" ]; then
  echo "ERROR: No 20i API spec found in archive/gitignor_ref_folder/" >&2
  echo "" >&2
  echo "The API Blueprint spec (20i_api_doc*.apib) is gitignored and is not" >&2
  echo "present in fresh clones. Fetch the current spec from:" >&2
  echo "  https://20i.docs.apiary.io/api-description-document" >&2
  echo "and save it as archive/gitignor_ref_folder/20i_api_doc_<date>.apib" >&2
  echo "(this script always uses the newest matching file)." >&2
  exit 1
fi

echo "=== 20i MCP Server API Coverage Analysis ==="
echo ""

# Count official API endpoints as UNIQUE method+path pairs.
# The API Blueprint format nests action headings ('### Action [METHOD]')
# under the nearest preceding resource heading ('## Name [/path]'), so we
# track the current resource path and pair it with each action's method.
#
# Wrap-tolerance: at least one action heading in the spec is wrapped across
# multiple lines, with the '[METHOD]' tag landing on a continuation line
# rather than the '### ' line itself. When a '### ' line carries no method
# tag we stay in a pending state and keep scanning continuation lines until
# a line ending in '[METHOD]' closes the heading (a blank line or a new
# heading cancels the pending state).
echo "Official 20i API Documentation Analysis ($API_SPEC):"
echo "----------------------------------------"
ENDPOINTS=$(awk '
  function emit(line,   m) {
    match(line, /\[(GET|POST|PUT|DELETE|PATCH)\][[:space:]]*$/)
    m = substr(line, RSTART + 1)
    sub(/\].*/, "", m)
    print m " " path
  }
  /^## /  { path = $0; sub(/^## .*\[/, "", path); sub(/\]$/, "", path); pending = 0 }
  /^### / {
    pending = 0
    if ($0 ~ /\[(GET|POST|PUT|DELETE|PATCH)\][[:space:]]*$/) emit($0)
    else pending = 1
    next
  }
  pending {
    if ($0 ~ /^[[:space:]]*$/) { pending = 0; next }
    if ($0 ~ /\[(GET|POST|PUT|DELETE|PATCH)\][[:space:]]*$/) { emit($0); pending = 0 }
  }
' "$API_SPEC" | sort -u)

GET_COUNT=$(echo "$ENDPOINTS" | grep -c "^GET ")
POST_COUNT=$(echo "$ENDPOINTS" | grep -c "^POST ")
PUT_COUNT=$(echo "$ENDPOINTS" | grep -c "^PUT ")
DELETE_COUNT=$(echo "$ENDPOINTS" | grep -c "^DELETE ")
PATCH_COUNT=$(echo "$ENDPOINTS" | grep -c "^PATCH ")
TOTAL_ENDPOINTS=$(echo "$ENDPOINTS" | grep -c ".")

echo "GET endpoints: $GET_COUNT"
echo "POST endpoints: $POST_COUNT"
echo "PUT endpoints: $PUT_COUNT"
echo "DELETE endpoints: $DELETE_COUNT"
echo "PATCH endpoints: $PATCH_COUNT"
echo "TOTAL API endpoints (unique method+path): $TOTAL_ENDPOINTS"
echo ""

if [ "$TOTAL_ENDPOINTS" -eq 0 ]; then
  echo "ERROR: Parsed 0 endpoints from $API_SPEC — the file exists but does" >&2
  echo "not look like a 20i API Blueprint. Re-fetch it from:" >&2
  echo "  https://20i.docs.apiary.io/api-description-document" >&2
  exit 1
fi

# --- Implemented MCP tools ---------------------------------------------------
# A tool only works end-to-end when it is BOTH defined in the ListTools tools
# array AND has a case handler in the CallTool switch. We count each set
# separately, then use the intersection ("fully wired") as the honest
# coverage numerator. Note: some case handlers are one-line delegations to
# handler modules in src/modules/ — they still appear as "case 'name':"
# lines in src/index.ts, so they are counted here like any other handler.
echo "Implemented MCP Tools Analysis:"
echo "-------------------------------"
TMPDIR_COV=$(mktemp -d)
trap 'rm -rf "$TMPDIR_COV"' EXIT

# Tool definitions: names inside the ListTools tools array only
# (bounded by 'tools: [' and the CallTool request handler registration).
sed -n '/tools: \[/,/CallToolRequestSchema/p' src/index.ts \
  | grep "name: '" | sed "s/.*name: '//;s/'.*//" | sort -u > "$TMPDIR_COV/defs.txt"

# Case handlers: labels in the CallTool switch (includes the one-line
# delegations to src/modules/ handler modules).
grep "case '" src/index.ts | sed "s/.*case '//;s/'.*//" | sort -u > "$TMPDIR_COV/cases.txt"

comm -12 "$TMPDIR_COV/defs.txt" "$TMPDIR_COV/cases.txt" > "$TMPDIR_COV/wired.txt"
comm -23 "$TMPDIR_COV/defs.txt" "$TMPDIR_COV/cases.txt" > "$TMPDIR_COV/def_only.txt"
comm -13 "$TMPDIR_COV/defs.txt" "$TMPDIR_COV/cases.txt" > "$TMPDIR_COV/case_only.txt"

DEFINITIONS=$(wc -l < "$TMPDIR_COV/defs.txt" | tr -d ' ')
CASE_HANDLERS=$(wc -l < "$TMPDIR_COV/cases.txt" | tr -d ' ')
FULLY_WIRED=$(wc -l < "$TMPDIR_COV/wired.txt" | tr -d ' ')
DEF_ONLY=$(wc -l < "$TMPDIR_COV/def_only.txt" | tr -d ' ')
CASE_ONLY=$(wc -l < "$TMPDIR_COV/case_only.txt" | tr -d ' ')

echo "Tool definitions (ListTools array): $DEFINITIONS"
echo "Case handlers (CallTool switch):    $CASE_HANDLERS"
echo "FULLY WIRED (defined + handled):    $FULLY_WIRED"
echo ""

# --- Coverage ----------------------------------------------------------------
echo "API Coverage Calculation:"
echo "------------------------"
COVERAGE=$(echo "scale=4; $FULLY_WIRED/$TOTAL_ENDPOINTS*100" | bc | awk '{printf "%.1f", $0}')
echo "Coverage (fully-wired tools / documented endpoints): $FULLY_WIRED / $TOTAL_ENDPOINTS = $COVERAGE%"
echo ""

# --- Mismatches --------------------------------------------------------------
if [ "$DEF_ONLY" -gt 0 ] || [ "$CASE_ONLY" -gt 0 ]; then
  echo "NEEDS ATTENTION:"
  echo "----------------"
  if [ "$DEF_ONLY" -gt 0 ]; then
    echo "Defined in tools array but NO case handler ($DEF_ONLY) — advertised to clients but will fail when called:"
    sed 's/^/  - /' "$TMPDIR_COV/def_only.txt"
    echo ""
  fi
  if [ "$CASE_ONLY" -gt 0 ]; then
    echo "Case handler but NOT defined in tools array ($CASE_ONLY) — dead code, never advertised to clients:"
    sed 's/^/  - /' "$TMPDIR_COV/case_only.txt"
    echo ""
  fi
fi

# --- API groups ---------------------------------------------------------------
echo "API Groups:"
echo "-----------"
grep "^# Group" "$API_SPEC" | sed 's/# Group //'
echo ""

echo "=== Analysis Complete ==="
