export type QueryContext = Record<string, string | string[] | undefined> | Pick<FormData, "get"> | undefined

/** Carry only explicitly named, short navigation values. Callers supply the
 * destination; form values never choose a redirect host or path. */
export function queryContextEntries(values: QueryContext, names: readonly string[]): [string, string][] {
  return names.flatMap(name => {
    const value = values && typeof values.get === "function"
      ? values.get(name)
      : (values as Record<string, unknown> | undefined)?.[name]
    return typeof value === "string" && value.length > 0 && value.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value)
      ? [[name, value] as [string, string]] : []
  })
}

export function withQueryContext(path: string, values: QueryContext, names: readonly string[]): string {
  const hashIndex = path.indexOf("#")
  const hash = hashIndex < 0 ? "" : path.slice(hashIndex)
  const [pathname, search = ""] = (hashIndex < 0 ? path : path.slice(0, hashIndex)).split("?")
  const query = new URLSearchParams(search)
  for (const [name, value] of queryContextEntries(values, names)) {
    if (!query.has(name)) query.set(name, value)
  }
  return `${pathname}${query.size ? `?${query}` : ""}${hash}`
}
