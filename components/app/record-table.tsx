import Link from "next/link"
import type { ReactNode } from "react"
import { Avatar } from "@/components/ui/avatar"

type Column = { key: string; label: string; numeric?: boolean; fullWidthOnMobile?: boolean; width?: string }
type RecordRow = {
  id: string; name: string; href?: string; description?: ReactNode; identityAction?: ReactNode
  cells: Record<string, ReactNode>
}

/** Shared record presentation: a separate identity column on desktop and the
 * same labeled fields in cards on touch layouts. Data and actions stay in callers. */
export function RecordTable({ label, identityLabel = "Name", columns, rows }: {
  label: string; identityLabel?: string; columns: Column[]; rows: RecordRow[]
}) {
  const identity = (row: RecordRow) => <div className="flex min-w-0 items-center gap-3"><Avatar name={row.name} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2">{row.href ? <Link prefetch={false} href={row.href} className="min-w-0 break-words font-semibold text-foreground hover:text-primary hover:underline">{row.name}</Link> : <span className="min-w-0 break-words font-semibold">{row.name}</span>}{row.identityAction}</div>{row.description ? <div className="mt-1 break-words text-xs font-normal leading-5 text-muted-foreground">{row.description}</div> : null}</div></div>
  return <>
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
      <table className="w-full table-fixed text-sm"><caption className="sr-only">{label}</caption><thead><tr className="border-b border-border bg-muted/35 text-left text-xs text-muted-foreground"><th scope="col" className="w-[30%] px-4 py-3 font-medium">{identityLabel}</th>{columns.map(column => <th key={column.key} scope="col" style={{ width: column.width }} className={`px-4 py-3 font-medium ${column.numeric ? "text-right" : ""}`}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 72px" }}><th scope="row" className="px-4 py-4 text-left font-normal">{identity(row)}</th>{columns.map(column => <td key={column.key} className={`break-words px-4 py-4 align-middle text-muted-foreground [overflow-wrap:anywhere] ${column.numeric ? "text-right tabular-nums" : ""}`}>{row.cells[column.key] ?? "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <ul aria-label={label} className="grid gap-3 md:grid-cols-2 xl:hidden">{rows.map(row => <li key={row.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-card" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 210px" }}><div className="border-b border-border px-4 py-4 text-sm">{identity(row)}</div><dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">{columns.map(column => <div key={column.key} className={`min-w-0 ${column.fullWidthOnMobile ? "col-span-2" : ""}`}><dt className="text-xs text-muted-foreground">{column.label}</dt><dd className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{row.cells[column.key] ?? "—"}</dd></div>)}</dl></li>)}</ul>
  </>
}
