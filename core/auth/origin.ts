import "server-only"

function configuredAppOrigin(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!appUrl) {
    return null
  }

  return new URL(appUrl).origin
}

function assertProductionAppOrigin(): string {
  const origin = configuredAppOrigin()

  if (origin) {
    return origin
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required for production auth redirects")
  }

  return "http://localhost:3000"
}

export function resolveAppOriginFromHeaders(headers: Headers): string {
  const origin = configuredAppOrigin()

  if (origin) {
    return origin
  }

  const requestOrigin = headers.get("origin")

  if (requestOrigin?.startsWith("http://localhost") || requestOrigin?.startsWith("http://127.0.0.1")) {
    return requestOrigin
  }

  return assertProductionAppOrigin()
}

export function resolveAppOriginFromRequest(request: Request): string {
  const origin = configuredAppOrigin()

  if (origin) {
    return origin
  }

  if (process.env.NODE_ENV !== "production") {
    return new URL(request.url).origin
  }

  return assertProductionAppOrigin()
}
