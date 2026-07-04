// Pure color math shared by the server-rendered theme injector
// (core/branding/theme.ts) and the client-rendered branding preview
// (components/app/settings/branding-section.tsx). No "server-only" marker —
// this must stay safe to bundle for the browser.

/** Perceived luminance (0..1) of a #rrggbb color for foreground contrast. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Readable foreground (near-black or white) for a #rrggbb background. */
export function foregroundFor(hex: string): string {
  return luminance(hex) > 0.6 ? "#171717" : "#ffffff"
}
