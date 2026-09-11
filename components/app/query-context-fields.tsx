import { queryContextEntries, type QueryContext } from "@/core/navigation/query-context"

export function QueryContextFields({ values, names }: { values: QueryContext; names: readonly string[] }) {
  return queryContextEntries(values, names).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
}
