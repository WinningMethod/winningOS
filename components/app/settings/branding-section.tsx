import { Hexagon, ImageIcon, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateBrandingSettings } from "@/core/settings/actions"
import type { CoreBrandingOverview } from "@/core/settings/data"

const DEFAULT_PRIMARY_COLOR = "#3a5bd9"

export function BrandingSection({
  branding,
  canManage,
}: {
  branding: CoreBrandingOverview | null
  canManage: boolean
}) {
  if (!branding) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Branding data could not be loaded. Refresh the page to try again.
      </p>
    )
  }

  const primaryColor = branding.primaryColor ?? DEFAULT_PRIMARY_COLOR

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Identity */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              {canManage
                ? "Brand name, logo, and primary color for this workspace. Changes save immediately, appear in auth emails, and are recorded in the audit trail."
                : "Brand name, logo, and primary color for this workspace. You need the branding.manage permission to edit them."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateBrandingSettings} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input
                  id="brand-name"
                  name="brandName"
                  defaultValue={branding.brandName}
                  placeholder="Workspace brand name"
                  required
                  maxLength={120}
                  disabled={!canManage}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-logo">Logo URL</Label>
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                    {branding.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote logo host is workspace-configured, not build-time known
                      <img src={branding.logoUrl} alt="Workspace logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </span>
                  <div className="flex-1">
                    <Input
                      id="brand-logo"
                      name="logoUrl"
                      type="url"
                      defaultValue={branding.logoUrl ?? ""}
                      placeholder="https://example.com/logo.svg"
                      maxLength={2048}
                      disabled={!canManage}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Public https:// URL to an SVG or PNG. Leave blank for none; file upload arrives with storage support.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-primary">Primary color</Label>
                <div className="flex items-center gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-md border border-border"
                    style={{ backgroundColor: primaryColor }}
                    aria-hidden="true"
                  />
                  <Input
                    id="brand-primary"
                    name="primaryColor"
                    defaultValue={branding.primaryColor ?? ""}
                    placeholder={DEFAULT_PRIMARY_COLOR}
                    pattern="#[0-9a-fA-F]{6}"
                    title="#rrggbb hex value"
                    aria-describedby="brand-primary-hint"
                    className="w-32 font-mono text-xs"
                    disabled={!canManage}
                  />
                  <code className="font-mono text-xs text-muted-foreground">--primary</code>
                </div>
                <p id="brand-primary-hint" className="text-xs text-muted-foreground">
                  #rrggbb hex value.
                </p>
              </div>

              {canManage && (
                <div>
                  <Button type="submit">
                    <Save className="h-4 w-4" />
                    Save branding
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="lg:col-span-2">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How the saved primary color reads on a workspace surface.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Hexagon className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-xs font-semibold">{branding.brandName}</span>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-medium">Workspace surface</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Named tokens keep components consistent.
                </p>
                <div className="mt-3 flex gap-2">
                  <span
                    className="rounded px-2.5 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </span>
                  <span className="rounded border border-border px-2.5 py-1 text-[11px] font-medium">
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
