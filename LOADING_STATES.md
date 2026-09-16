# Page loading standard

All WinningOS pages and templates use skeleton screens while awaiting page data.
Do not replace page content with a visible loading sentence or a standalone spinner.

- Core owns the default `app/(app)/loading.tsx` fallback, inherited by plugin and alias routes.
- Core pages use `PageSkeleton` layouts matching their structure: overview, list, settings, or docs. Auth routes use `AuthSkeleton`.
- Keep the existing shell and navigation interactive while content streams. Local UI changes that already have data should render immediately without a skeleton.
- Use theme tokens, stable dimensions, and responsive widths. Never show fabricated records, privileged labels, or interactive placeholder controls.
- Hide decorative blocks from assistive technology; announce one screen-reader-only loading status. Animate only with `motion-safe` so reduced-motion users receive static placeholders.
- Page-specific or nested Suspense fallbacks follow the same rules and match the content they replace. Plugins import Core only through the sanctioned API; they must not import internal skeleton components.
- Action feedback (saving, sending, rotating a key) remains in its control; do not blank an already loaded page to indicate an action is pending.

Acceptance: exercise a cold route transition on a slow connection, confirm the shell remains usable, the skeleton resolves into real content, and mobile widths do not overflow. Also check reduced motion and keyboard focus. Do not add artificial production delays merely to display a skeleton.

Authentication load: route links default to `prefetch={false}`. Loading boundaries must not cause background authenticated page requests. Session bootstrap is deduplicated only within a server render, and the request proxy persists refreshed cookies before page rendering. Recheck live auth after adding loading boundaries.
