import Link from "next/link"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PluginNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="Plugin page not found"
        description="This plugin is not installed here, or the requested plugin route does not exist."
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>404 — Not found</CardTitle>
          <CardDescription>
            Plugin routes are available only when their source is installed and registered for this deployment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/home" className="text-sm font-medium text-primary hover:underline">
            Return home
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
