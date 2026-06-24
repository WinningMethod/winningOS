/** @type {import('next').NextConfig} */

// Baseline security response headers. Applied to every route so the hardening
// is in place before auth and real data land in a later build.
const securityHeaders = [
  // Disallow MIME sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection — this app is never meant to be framed.
  { key: "X-Frame-Options", value: "DENY" },
  // Don't leak full URLs to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful browser features the app does not use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Force HTTPS once served over TLS (Vercel).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
