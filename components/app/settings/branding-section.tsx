import { Hexagon, ImageIcon, Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { brandTokens } from "@/lib/mock-data"

const primary = brandTokens.colors.find((c) => c.token === "--primary") ?? brandTokens.colors[0]

export function BrandingSection() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Identity */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Brand name, logo, and primary color for this workspace.</CardDescription>
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="brand-primary">Primary color</Label>
              <div className="flex items-center gap-3">
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-border"
                  style={{ backgroundColor: primary.value }}
                  aria-hidden="true"
                />
                <Input
                  id="brand-primary"
                  defaultValue={primary.value}
                  className="w-32 font-mono text-xs"
                />
                <code className="font-mono text-xs text-muted-foreground">{primary.token}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="lg:col-span-2">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How the primary color reads on a workspace surface.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded text-white"
                  style={{ backgroundColor: primary.value, borderRadius: brandTokens.radius }}
                >
                  <Hexagon className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-xs font-semibold">{brandTokens.name}</span>
              </div>
              <div
                className="rounded-md border border-border p-3"
                style={{ borderRadius: brandTokens.radius }}
              >
                <p className="text-xs font-medium">Workspace surface</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Named tokens keep components consistent.
                </p>
                <div className="mt-3 flex gap-2">
                  <span
                    className="rounded px-2.5 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: primary.value, borderRadius: brandTokens.radius }}
                  >
                    Primary
                  </span>
                  <span
                    className="rounded border border-border px-2.5 py-1 text-[11px] font-medium"
                    style={{ borderRadius: brandTokens.radius }}
                  >
                    Secondary
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
