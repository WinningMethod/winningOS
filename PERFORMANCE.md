# Page performance standard

Every Core page and plugin must meet this contract before release.

- Render the destination skeleton immediately from the workspace shell; use matching Suspense skeletons for independently loaded sections. Keep the router outlet mounted. No artificial delay, minimum skeleton duration, or extra refresh request.
- Use WorkspaceLink for Core route navigation. Plugin routes inherit host navigation and loading; plugin-owned links must disable speculative prefetch. Do not import Core internal components around the public Plugin API.
- Changes to already-loaded UI (Docs topics, tabs, local filters) should stay local when no new server data is needed. Preserve deep links and browser history where applicable.
- Authenticate and authorize on the server. Deduplicate clients, sessions and permission reads only within a render using React cache. Never persist user sessions or permission decisions across requests to improve speed. Mutations still reauthorize in the database.
- Start independent reads together. Start streamed secondary work alongside primary work, not after it. Keep secondary panels from blocking the visible panel.
- Prefer a single bounded query or authorized RPC per data concern. Use explicit columns, existing relations for joined reads, and limits or pagination for growing lists. Never fetch an entire directory solely to compute a large-scale dashboard count; introduce an authorized aggregate before scale requires it.
- Zero installed plugins means zero plugin-permission queries. Installed plugins share one permission-table read per render rather than one query per permission.
- Keep no-data, error, unauthorized and pending states distinct. Faster loading must never display fabricated data or stale permissions.
- Timing logs must contain only fixed endpoint labels, status, and duration. No tokens, URLs with query values, user IDs, records, headers, or request/response bodies. Current responseHeadersMs measures fetch until response headers, not full browser load time.

## Review and acceptance

Run `npm run perf:validate` plus the repository checks. The validator catches known regressions; it is not a performance benchmark or proof of authorization.

For each route, record its critical query path and query count, check a cold load and warm navigation, keyboard/mobile navigation, pending-to-ready and pending-to-error behavior, and verify role isolation. Compare like-for-like median/p95 over repeated samples before claiming a general speedup. Keep full-refresh timings separate from client navigation and initial-content timings separate from complete-response timings. Document variability instead of selecting only the fastest sample.

Investigate database/function placement and cold-start costs with measurements before changing hosting or buying a higher plan. Keep public theme caching separate from protected business data and invalidate any future cross-request theme cache on changes.
