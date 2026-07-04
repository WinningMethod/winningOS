// Curated lucide-react icons plugin manifests may name (manifest navigation
// entries carry an icon *name string*, never a component — see
// COMPATIBILITY.md). A curated map keeps the client bundle from swallowing the
// whole icon library and makes unknown names degrade predictably: anything not
// listed renders the generic Puzzle icon.

import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Database,
  FileText,
  FolderOpen,
  ListChecks,
  MessageSquare,
  NotebookText,
  Puzzle,
  StickyNote,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

const pluginIcons: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Database,
  FileText,
  FolderOpen,
  ListChecks,
  MessageSquare,
  NotebookText,
  Puzzle,
  StickyNote,
  Users,
  Wrench,
}

export function resolvePluginNavIcon(iconName: string): LucideIcon {
  return pluginIcons[iconName] ?? Puzzle
}
