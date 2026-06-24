import { Boxes } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { EmptyState } from "@/components/app/states"

export default function ModulesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Modules"
        description="Build-time modules extend WinningOS with company-specific capabilities."
      />
      <div className="mt-6">
        <EmptyState
          icon={Boxes}
          title="Modules are not available yet"
          description="WinningOS Core uses build-time modules added to the source before deploy. Runtime plugin loading is out of scope, and module management arrives in a later build."
        />
      </div>
    </PageContainer>
  )
}
