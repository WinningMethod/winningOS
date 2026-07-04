/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Logo uploads allow files up to 2 MB; the default 1 MB action body
      // limit made larger files crash to the error boundary instead of the
      // friendly validation message (issue #57). Headroom covers multipart
      // overhead; the action still rejects anything over 2 MB itself.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path(sign-in|pending-access|auth/.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ]
  },
}

export default nextConfig
