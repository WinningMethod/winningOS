import { Hexagon, ImageIcon, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateBrandingSettings } from "@/core/settings/actions"
import type { CoreBrandingOverview } from "@/core/settings/data"

const DEFAULT_PRIMARY_COLOR = "#3a5bd9"
const DEFAULT_SECONDARY_COLOR = "#eef1f8"
const DEFAULT_TERTIARY_COLOR = "#f2f4f9"

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
  const secondaryColor = branding.secondaryColor ?? DEFAULT_SECONDARY_COLOR
  const tertiaryColor = branding.tertiaryColor ?? DEFAULT_TERTIARY_COLOR

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Identity */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              {canManage
                ? "Brand name, logo, and theme colors for this workspace. Saved colors restyle the whole app (and future plugins), appear in auth emails, and every change is recorded in the audit trail."
                : "Brand name, logo, and theme colors for this workspace. You need the branding.manage permission to edit them."}
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
                <Label htmlFor="brand-logo-file">Logo</Label>
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                    {branding.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote logo host is workspace-configured, not build-time known
                      <img src={branding.logoUrl} alt="Workspace logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </span>
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      id="brand-logo-file"
                      name="logoFile"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      aria-describedby="brand-logo-hint"
                      disabled={!canManage}
                      className="h-auto py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-secondary-foreground"
                    />
                    <Input
                      id="brand-logo"
                      name="logoUrl"
                      type="url"
                      defaultValue={branding.logoUrl ?? ""}
                      placeholder="…or paste a public https:// image URL"
                      maxLength={2048}
                      disabled={!canManage}
                    />
                    <p id="brand-logo-hint" className="text-xs text-muted-foreground">
                      Upload an SVG, PNG, JPEG, or WebP up to 2 MB — or paste a public URL. An uploaded
                      file replaces the URL.
                    </p>
                  </div>
                </div>
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium">Theme colors</legend>
                <p className="text-xs text-muted-foreground" id="brand-colors-hint">
                  #rrggbb hex values. Leave a field blank to keep the default token. Saved colors apply
                  across the app: primary drives buttons and focus, secondary drives subtle surfaces,
                  tertiary drives hover accents.
                </p>
                <ColorField
                  id="brand-primary"
                  name="primaryColor"
                  label="Primary color"
                  token="--primary"
                  value={branding.primaryColor}
                  swatch={primaryColor}
                  placeholder={DEFAULT_PRIMARY_COLOR}
                  disabled={!canManage}
                />
                <ColorField
                  id="brand-secondary"
                  name="secondaryColor"
                  label="Secondary color"
                  token="--secondary"
                  value={branding.secondaryColor}
                  swatch={secondaryColor}
                  placeholder={DEFAULT_SECONDARY_COLOR}
                  disabled={!canManage}
                />
                <ColorField
                  id="brand-tertiary"
                  name="tertiaryColor"
                  label="Tertiary color"
                  token="--accent"
                  value={branding.tertiaryColor}
                  swatch={tertiaryColor}
                  placeholder={DEFAULT_TERTIARY_COLOR}
                  disabled={!canManage}
                />
              </fieldset>

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
            <CardDescription>How the saved colors read on a workspace surface.</CardDescription>
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
              <div className="rounded-md border border-border p-3" style={{ backgroundColor: tertiaryColor }}>
                <p className="text-xs font-medium text-neutral-900">Workspace surface</p>
                <p className="mt-0.5 text-[11px] text-neutral-600">
                  Named tokens keep components consistent.
                </p>
                <div className="mt-3 flex gap-2">
                  <span
                    className="rounded px-2.5 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </span>
                  <span
                    className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-neutral-900"
                    style={{ backgroundColor: secondaryColor }}
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

function ColorField({
  id,
  name,
  label,
  token,
  value,
  swatch,
  placeholder,
  disabled,
}: {
  id: string
  name: string
  label: string
  token: string
  value: string | null
  swatch: string
  placeholder: string
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <span
          className="h-9 w-9 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: swatch }}
          aria-hidden="true"
        />
        <Input
          id={id}
          name={name}
          defaultValue={value ?? ""}
          placeholder={placeholder}
          pattern="#[0-9a-fA-F]{6}"
          title="#rrggbb hex value"
          aria-describedby="brand-colors-hint"
          className="w-32 font-mono text-xs"
          disabled={disabled}
        />
        <code className="font-mono text-xs text-muted-foreground">{token}</code>
      </div>
    </div>
  )
}
