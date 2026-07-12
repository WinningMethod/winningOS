"use client"

// In-sidebar editor for the viewer's personal nav layout. Edits a local copy
// of the layout (move, nest as dropdown children, group under a named
// category, hide into the bottom section) and persists through the
// saveNavLayout server action on save.
//
// The editor initializes from the *resolved* sidebar (buildSidebarNav), so it
// edits exactly what the user sees. Saving therefore rewrites the layout in
// terms of currently visible items — placements remembered for currently
// invisible keys are traded away for a WYSIWYG editing model.

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  CornerUpLeft,
  Eye,
  EyeOff,
  FolderPlus,
  Ungroup,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveNavLayout } from "@/core/nav/actions"
import type { SidebarNavItem } from "@/lib/navigation"
import {
  buildSidebarNav,
  MAX_GROUP_LABEL_LENGTH,
  NAV_LAYOUT_VERSION,
  type NavLayout,
  type NavLayoutNode,
} from "@/lib/nav-layout"
import { resolvePluginNavIcon } from "@/lib/plugin-icons"
import { cn } from "@/lib/utils"

type EditorNode =
  | { id: string; kind: "item"; key: string; children: string[] }
  | { id: string; kind: "group"; label: string; children: string[] }

type EditorState = {
  nodes: EditorNode[]
  hidden: string[]
}

let groupIdCounter = 0

function nextGroupId(): string {
  groupIdCounter += 1
  return `group-${groupIdCounter}`
}

function initialEditorState(items: SidebarNavItem[], layout: NavLayout | null): EditorState {
  const nav = buildSidebarNav(items, layout)

  return {
    nodes: nav.nodes.map((node) =>
      node.kind === "item"
        ? { id: `item-${node.item.key}`, kind: "item", key: node.item.key, children: node.children.map((child) => child.key) }
        : { id: nextGroupId(), kind: "group", label: node.label, children: node.children.map((child) => child.key) },
    ),
    hidden: nav.hidden.map((item) => item.key),
  }
}

function toNavLayout(state: EditorState): NavLayout {
  const nodes: NavLayoutNode[] = []

  for (const node of state.nodes) {
    if (node.kind === "item") {
      nodes.push(node.children.length > 0 ? { type: "item", key: node.key, children: node.children } : { type: "item", key: node.key })
      continue
    }

    const label = node.label.trim().slice(0, MAX_GROUP_LABEL_LENGTH)

    // Groups that end the session unnamed or empty carry nothing to render.
    if (label && node.children.length > 0) {
      nodes.push({ type: "group", label, children: node.children })
    }
  }

  return { version: NAV_LAYOUT_VERSION, nodes, hidden: state.hidden }
}

function moveEntry<T>(entries: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta

  if (target < 0 || target >= entries.length) {
    return entries
  }

  const next = [...entries]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      {children}
    </button>
  )
}

function ItemLabel({ item }: { item: SidebarNavItem }) {
  const Icon = resolvePluginNavIcon(item.iconName)

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-sidebar-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </span>
  )
}

// Entries rolled up from satellite plugins (manifest navRollup). They travel
// with their parent and are not individually editable here, so they render as
// informational rows without controls.
function RollupChildren({ item, indentClass = "pl-7" }: { item: SidebarNavItem; indentClass?: string }) {
  if (!item.children?.length) {
    return null
  }

  return (
    <ul className="flex flex-col">
      {item.children.map((child) => {
        const Icon = resolvePluginNavIcon(child.iconName)

        return (
          <li
            key={child.key}
            title="Grouped by plugin — moves with its parent"
            className={cn("flex items-center gap-2 py-1 pr-1 text-sm text-muted-foreground", indentClass)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{child.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function NavCustomizer({
  items,
  layout,
  onClose,
}: {
  items: SidebarNavItem[]
  layout: NavLayout | null
  onClose: () => void
}) {
  const router = useRouter()
  const [state, setState] = useState<EditorState>(() => initialEditorState(items, layout))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const itemsByKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items])

  const moveNode = (index: number, delta: -1 | 1) =>
    setState((current) => ({ ...current, nodes: moveEntry(current.nodes, index, delta) }))

  const moveChild = (nodeIndex: number, childIndex: number, delta: -1 | 1) =>
    setState((current) => ({
      ...current,
      nodes: current.nodes.map((node, i) =>
        i === nodeIndex ? { ...node, children: moveEntry(node.children, childIndex, delta) } : node,
      ),
    }))

  // Nest a childless top-level item under the node directly above it — a
  // group gains a member, a plain item becomes a parent with a dropdown.
  // Rollup clusters may join groups but not another item's dropdown (their
  // own children would end up at an unreachable depth).
  const nestUnderPrevious = (index: number) =>
    setState((current) => {
      const node = current.nodes[index]

      if (index === 0 || node.kind !== "item" || node.children.length > 0) {
        return current
      }

      const isCluster = (itemsByKey.get(node.key)?.children?.length ?? 0) > 0

      if (isCluster && current.nodes[index - 1].kind !== "group") {
        return current
      }

      const nodes = current.nodes.filter((_, i) => i !== index)
      const previous = nodes[index - 1]
      nodes[index - 1] = { ...previous, children: [...previous.children, node.key] }
      return { ...current, nodes }
    })

  const promoteChild = (nodeIndex: number, key: string) =>
    setState((current) => {
      const nodes = current.nodes.map((node, i) =>
        i === nodeIndex ? { ...node, children: node.children.filter((child) => child !== key) } : node,
      )
      nodes.splice(nodeIndex + 1, 0, { id: `item-${key}`, kind: "item", key, children: [] })
      return { ...current, nodes }
    })

  // Hiding a parent keeps its children visible: they are promoted to
  // top-level entries in its place.
  const hideNode = (index: number) =>
    setState((current) => {
      const node = current.nodes[index]

      if (node.kind !== "item") {
        return current
      }

      const nodes = [...current.nodes]
      nodes.splice(
        index,
        1,
        ...node.children.map<EditorNode>((key) => ({ id: `item-${key}`, kind: "item", key, children: [] })),
      )
      return { nodes, hidden: [...current.hidden, node.key] }
    })

  const hideChild = (nodeIndex: number, key: string) =>
    setState((current) => ({
      nodes: current.nodes.map((node, i) =>
        i === nodeIndex ? { ...node, children: node.children.filter((child) => child !== key) } : node,
      ),
      hidden: [...current.hidden, key],
    }))

  const unhide = (key: string) =>
    setState((current) => ({
      nodes: [...current.nodes, { id: `item-${key}`, kind: "item", key, children: [] }],
      hidden: current.hidden.filter((hidden) => hidden !== key),
    }))

  const addGroup = () =>
    setState((current) => ({
      ...current,
      nodes: [...current.nodes, { id: nextGroupId(), kind: "group", label: "New group", children: [] }],
    }))

  const renameGroup = (index: number, label: string) =>
    setState((current) => ({
      ...current,
      nodes: current.nodes.map((node, i) => (i === index ? { ...node, label } : node)),
    }))

  const ungroup = (index: number) =>
    setState((current) => {
      const node = current.nodes[index]

      if (node.kind !== "group") {
        return current
      }

      const nodes = [...current.nodes]
      nodes.splice(
        index,
        1,
        ...node.children.map<EditorNode>((key) => ({ id: `item-${key}`, kind: "item", key, children: [] })),
      )
      return { ...current, nodes }
    })

  const persist = (layoutToSave: NavLayout | null) => {
    setError(null)
    startTransition(async () => {
      const result = await saveNavLayout(layoutToSave)

      if (!result.ok) {
        setError("Could not save your layout. Please try again.")
        return
      }

      router.refresh()
      onClose()
    })
  }

  const renderChild = (nodeIndex: number, key: string, childIndex: number, childCount: number) => {
    const item = itemsByKey.get(key)

    if (!item) {
      return null
    }

    return (
      <li key={key}>
        <div className="flex items-center gap-1 rounded-md py-1 pl-7 pr-1 hover:bg-accent/50">
          <ItemLabel item={item} />
          <ControlButton label={`Move ${item.label} up`} onClick={() => moveChild(nodeIndex, childIndex, -1)} disabled={childIndex === 0}>
            <ArrowUp className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton
            label={`Move ${item.label} down`}
            onClick={() => moveChild(nodeIndex, childIndex, 1)}
            disabled={childIndex === childCount - 1}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label={`Move ${item.label} to top level`} onClick={() => promoteChild(nodeIndex, key)}>
            <CornerUpLeft className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label={`Hide ${item.label}`} onClick={() => hideChild(nodeIndex, key)}>
            <EyeOff className="h-3.5 w-3.5" />
          </ControlButton>
        </div>
        <RollupChildren item={item} indentClass="pl-12" />
      </li>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-sidebar-border px-4 py-3">
        <p className="text-sm font-semibold">Customize navigation</p>
        <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Reorder items, nest them under a parent or group, or hide them. Only you see this layout.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="flex flex-col gap-0.5">
          {state.nodes.map((node, index) => {
            if (node.kind === "group") {
              return (
                <li key={node.id} className="pt-1">
                  <div className="flex items-center gap-1 rounded-md py-1 pr-1 hover:bg-accent/50">
                    <input
                      type="text"
                      value={node.label}
                      maxLength={MAX_GROUP_LABEL_LENGTH}
                      aria-label="Group name"
                      onChange={(event) => renameGroup(index, event.target.value)}
                      className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground focus:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <ControlButton label={`Move group ${node.label} up`} onClick={() => moveNode(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </ControlButton>
                    <ControlButton
                      label={`Move group ${node.label} down`}
                      onClick={() => moveNode(index, 1)}
                      disabled={index === state.nodes.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </ControlButton>
                    <ControlButton label={`Ungroup ${node.label}`} onClick={() => ungroup(index)}>
                      <Ungroup className="h-3.5 w-3.5" />
                    </ControlButton>
                  </div>
                  {node.children.length === 0 ? (
                    <p className="py-1 pl-7 text-[11px] text-muted-foreground">
                      Empty — move an item below this group, then nest it.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {node.children.map((key, childIndex) => renderChild(index, key, childIndex, node.children.length))}
                    </ul>
                  )}
                </li>
              )
            }

            const item = itemsByKey.get(node.key)

            if (!item) {
              return null
            }

            return (
              <li key={node.id}>
                <div className="flex items-center gap-1 rounded-md py-1 pl-1 pr-1 hover:bg-accent/50">
                  <ItemLabel item={item} />
                  <ControlButton label={`Move ${item.label} up`} onClick={() => moveNode(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </ControlButton>
                  <ControlButton
                    label={`Move ${item.label} down`}
                    onClick={() => moveNode(index, 1)}
                    disabled={index === state.nodes.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </ControlButton>
                  <ControlButton
                    label={`Nest ${item.label} under the entry above`}
                    onClick={() => nestUnderPrevious(index)}
                    disabled={
                      index === 0
                      || node.children.length > 0
                      || ((item.children?.length ?? 0) > 0 && state.nodes[index - 1].kind !== "group")
                    }
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                  </ControlButton>
                  <ControlButton label={`Hide ${item.label}`} onClick={() => hideNode(index)}>
                    <EyeOff className="h-3.5 w-3.5" />
                  </ControlButton>
                </div>
                <RollupChildren item={item} />
                {node.children.length > 0 && (
                  <ul className="flex flex-col gap-0.5">
                    {node.children.map((key, childIndex) => renderChild(index, key, childIndex, node.children.length))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-4 border-t border-sidebar-border pt-3">
          <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Hidden</p>
          {state.hidden.length === 0 ? (
            <p className="px-1 py-1 text-[11px] text-muted-foreground">
              Nothing hidden. Hidden items collapse into a quiet section at the bottom of the sidebar.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {state.hidden.map((key) => {
                const item = itemsByKey.get(key)

                if (!item) {
                  return null
                }

                return (
                  <li key={key} className="flex items-center gap-1 rounded-md py-1 pl-1 pr-1 hover:bg-accent/50">
                    <ItemLabel item={item} />
                    <ControlButton label={`Show ${item.label}`} onClick={() => unhide(key)}>
                      <Eye className="h-3.5 w-3.5" />
                    </ControlButton>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3">
        {error && <p className="pb-2 text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addGroup} disabled={pending}>
            <FolderPlus className="h-3.5 w-3.5" />
            New group
          </Button>
          <button
            type="button"
            onClick={() => persist(null)}
            disabled={pending}
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Reset to default
          </button>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" className="flex-1" onClick={() => persist(toNavLayout(state))} disabled={pending}>
            {pending ? "Saving…" : "Save layout"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
