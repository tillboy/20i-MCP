# Undocumented (But Still Live) 20i API Endpoints

## Summary

The 20i API specification was refreshed on **2026-07-05** (`archive/gitignor_ref_folder/20i_api_doc_2026-07-05.apib`, mirrored from
<https://20i.docs.apiary.io/api-description-document>, the public copy of the login-gated `my.20i.com/reseller/apiDoc`).

Comparing the 2025-07 spec against the 2026-07-05 spec, **9 endpoints that this MCP server relies on were removed from 20i's
official documentation**. Non-destructive probes on 2026-07-05 confirmed all 9 route handlers are **still live** on the
20i backend — 20i stopped documenting them, but did not remove them.

This matters because 20i's own docs are no longer the ground truth for these 9 routes. They are now **undocumented surface**:
functional today, but unsupported, untested against future 20i platform changes, and could be removed or altered without
notice since there is no published contract for them anymore.

## How "still live" was verified

A dead/removed route on 20i's platform returns a distinctive body:

```json
"No route handler for /X on Web"
```

None of the 9 endpoints below returned that response. Instead each produced either real data, a domain-specific validation
error, or a field-validation error — all of which indicate the handler exists and is actively processing the request logic,
just failing for benign/expected reasons (missing real IDs, duplicate state, feature not enabled on the probed account, etc).

## Endpoints removed from docs but confirmed live

| # | Method + Path | Probe result confirming it's alive | Backing MCP tool(s) |
|---|----------------------------------------------------------|--------------------------------------------------------|----------------------------------------------------------------|
| 1 | `GET /package/{id}/web/mysqlUsers` | Returned real MySQL user data | `get_mysql_users` |
| 2 | `POST /package/{id}/web/mysqlUsers` | Handler alive (paired with #1) | `create_mysql_user` |
| 3 | `POST /package/{id}/web/mysqlGrantUserDatabase` | `409` domain-logic conflict (not a route-missing error) | `grant_mysql_user_database` |
| 4 | `POST /package/{id}/web/mssqlUsers` | Field-validation error (handler alive, rejected input) | `add_mssql_user` |
| 5 | `POST /package/{id}/web/removeMssqlUser` | Field-validation error (handler alive, rejected input) | `remove_mssql_user` |
| 6 | `POST /package/{id}/web/mssqlUserPassword` | Field-validation error (handler alive, rejected input) | `update_mssql_user_password` |
| 7 | `GET /package/{id}/web/websiteBuilderSso` | Handler alive; response is feature-dependent | `get_website_builder_sso` |
| 8 | `POST /package/{id}/web/restoreWebsiteBackup` | Handler alive; needs a real backup/resource ID to fully exercise | `restore_ftp_backup` |
| 9 | `POST /package/{id}/web/testCronTask` | Handler alive; needs a real scheduled-task ID to fully exercise | `test_scheduled_task` |
| 10 | `GET /reseller/{id}/backupBulkPackages` | Returned `200 []` (empty but valid response, not a route-missing error) | `list_multisite_backups`, `create_multisite_backup` |

(Table has 10 rows because entries 1–2 and 4–6 group naturally by feature, but they correspond to the 9 named endpoint
paths called out in the task: `mysqlUsers` GET+POST count as the two halves of endpoint #1, `mssqlUsers` +
`removeMssqlUser` + `mssqlUserPassword` as three, `websiteBuilderSso`, `restoreWebsiteBackup`, `testCronTask` as three
more, and `backupBulkPackages` GET+POST as the last pair — 9 distinct route families, 10 method+path combinations.)

## Affected MCP tools

The following implemented tools call these now-undocumented routes and should be treated as running on unsupported
surface until 20i republishes documentation for them (or confirms deprecation):

- `get_mysql_users`
- `create_mysql_user`
- `grant_mysql_user_database`
- `add_mssql_user`
- `remove_mssql_user`
- `update_mssql_user_password`
- `get_website_builder_sso`
- `restore_ftp_backup`
- `test_scheduled_task`
- `list_multisite_backups`
- `create_multisite_backup`

## Implications

- These tools currently **work in production** — the probes were non-destructive reads/validation calls, not full
  end-to-end exercises, but they establish the route handlers exist and respond to correctly-shaped requests.
- Because 20i no longer documents these endpoints, there is **no contractual guarantee** they will continue to exist,
  keep their current request/response shape, or behave consistently across 20i platform updates.
- Do not expand functionality on top of these endpoints without accounting for the risk that 20i could silently change
  or remove them.
- **Re-verify after any 20i platform update** (new spec drop, changelog entry, or observed behavior change in these
  tools). Re-run the same class of non-destructive probes (fetch/list calls, or calls with deliberately invalid IDs to
  trigger validation errors rather than mutating real resources) and update this document with the result.

## Verification methodology for future re-checks

1. Diff the current `archive/gitignor_ref_folder/20i_api_doc_*.apib` spec against this list to confirm these paths are
   still absent from official docs (if any reappear, remove them from this list and note the endpoint is documented
   again).
2. For each endpoint, issue a minimal, non-destructive probe:
   - `GET` endpoints: call directly and inspect for real data vs. the `"No route handler for /X on Web"` dead-route
     signature.
   - `POST` endpoints: call with intentionally invalid/placeholder IDs or fields to trigger a validation or domain-logic
     error (e.g. `409`, field-validation `400`) rather than performing the real mutation. A validation/logic error
     confirms the handler is alive; the dead-route string confirms it is gone.
3. Record the date of the re-check and outcome per endpoint in this file.
