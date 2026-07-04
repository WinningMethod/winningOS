// The plugin install registry — the ONLY file a deployment edits to install a
// plugin (COMPATIBILITY.md "Installation").
//
// This array stays `[]` forever in the framework repos (`winningOS` and the
// template). Plugins are installed only in deployment repos — clones of Core,
// one per company OS or scratch integration test (three-repository model).
// There, an install is exactly:
//
//   import examplePlugin from "@/plugins/example_plugin/manifest"
//
//   export const installedPlugins: WinningOSPluginManifest[] = [examplePlugin]
//
// Order matters: dependencies come before their dependents (install order), and
// removing a line removes the dependent before its dependency. Routes, nav,
// settings panels, and Roles-grid entries all derive from this array — deleting
// a line is disable-level removal with nothing else to forget.

import type { WinningOSPluginManifest } from "@/core/plugins/manifest"

export const installedPlugins: WinningOSPluginManifest[] = []
