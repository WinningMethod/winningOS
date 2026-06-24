import { Hexagon, ImageIcon, Upload } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { brandTokens } from "@/lib/mock-data"

const radii = [
  { label: "Sharp", value: "0rem" },
  { label: "Soft", value: "0.5rem", active: true },
  { label: "Round", value: "0.875rem" },
]

const densities = ["Compact", "Comfortable", "Spacious"]

export default function BrandingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Branding"
        description="Workspace identity is token-based. These tokens feed the theme so components consume named values, not one-off styles."
        actions={<Button>Save changes</Button>}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>Brand name and logo for this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input id="brand-name" defaultValue={brandTokens.name} placeholder="Workspace brand name" />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-logo">Logo</Label>
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <Button id="brand-logo" variant="outline">
                    <Upload className="h-4 w-4" />
                    Upload logo
                  </Button>
                  <span className="text-xs text-muted-foreground">SVG or PNG. Upload is mocked.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Color tokens</CardTitle>
              <CardDescription>Named color tokens applied across the workspace theme.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {brandTokens.colors.map((c) => (
                <div key={c.token} className="flex items-center gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: c.value }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.label}</p>
                    <code className="font-mono text-xs text-muted-foreground">{c.token}</code>
                  </div>
                  <Input
                    aria-label={`${c.label} token value`}
                    defaultValue={c.value}
                    className="w-28 font-mono text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shape & density */}
          <Card>
            <CardHeader>
              <CardTitle>Radius &amp; style</CardTitle>
              <CardDescription>Corner radius and density tokens.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Corner radius</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Corner radius">
                  {radii.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      aria-pressed={r.active ?? false}
                      className={
                        r.active
                          ? "flex items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          : "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      }
                    >
                      <span
                        className="h-4 w-4 border border-current bg-transparent"
                        style={{ borderRadius: r.value }}
                        aria-hidden="true"
                      />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Density</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Density">
                  {densities.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={d === brandTokens.density}
                      className={
                        d === brandTokens.density
                          ? "rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          : "rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <Badge tone="muted">Light / Dark</Badge>
              </div>
              <CardDescription>Token-driven preview of common surfaces.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <PreviewSurface scheme="light" />
              <PreviewSurface scheme="dark" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

function PreviewSurface({ scheme }: { scheme: "light" | "dark" }) {
  const isDark = scheme === "dark"
  const styles = isDark
    ? { bg: "#1c1f26", card: "#23262e", text: "#ECEEF2", sub: "#9aa1ad", border: "#333845" }
    : { bg: "#fafafa", card: "#ffffff", text: "#22252c", sub: "#6b7280", border: "#e6e7eb" }
  const primary = brandTokens.colors[0].value

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: styles.bg, borderColor: styles.border }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded"
          style={{ backgroundColor: primary, color: "#fff", borderRadius: brandTokens.radius }}
        >
          <Hexagon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-xs font-semibold" style={{ color: styles.text }}>
          {brandTokens.name}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: styles.sub }}>
          {scheme}
        </span>
      </div>
      <div
        className="rounded-md border p-3"
        style={{ backgroundColor: styles.card, borderColor: styles.border, borderRadius: brandTokens.radius }}
      >
        <p className="text-xs font-medium" style={{ color: styles.text }}>
          Workspace surface
        </p>
        <p className="mt-0.5 text-[11px]" style={{ color: styles.sub }}>
          Named tokens keep components consistent.
        </p>
        <div className="mt-3 flex gap-2">
          <span
            className="rounded px-2.5 py-1 text-[11px] font-medium text-white"
            style={{ backgroundColor: primary, borderRadius: brandTokens.radius }}
          >
            Primary
          </span>
          <span
            className="rounded border px-2.5 py-1 text-[11px] font-medium"
            style={{ borderColor: styles.border, color: styles.text, borderRadius: brandTokens.radius }}
          >
            Secondary
          </span>
        </div>
      </div>
    </div>
  )
}
