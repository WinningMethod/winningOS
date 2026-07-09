"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

type SlotModuleBoundaryProps = {
  /** The contributing plugin's id, shown in the failure note. */
  pluginId: string
  children?: ReactNode
}

type SlotModuleBoundaryState = {
  failed: boolean
}

/**
 * Error boundary Core wraps around every module resolved through
 * `resolveSlotModules` (ECOSYSTEM.md "Modules"). A module that throws while
 * rendering on the client degrades to a one-line failure note instead of
 * taking the host page down with it — a broken Bridge must never break the
 * App or Viewer hosting it.
 *
 * Boundaries only catch client-side render errors. A module whose
 * server-component render throws still fails the host route, so modules must
 * degrade gracefully on their own (missing context, empty data, fetch errors).
 */
export class SlotModuleBoundary extends Component<SlotModuleBoundaryProps, SlotModuleBoundaryState> {
  state: SlotModuleBoundaryState = { failed: false }

  static getDerivedStateFromError(): SlotModuleBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Slot module for ${this.props.pluginId} failed to render`, { error, info })
  }

  render() {
    if (this.state.failed) {
      return (
        <p role="alert" className="text-sm text-muted-foreground">
          The {this.props.pluginId} module failed to render.
        </p>
      )
    }

    return this.props.children
  }
}
