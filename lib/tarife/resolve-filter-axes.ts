import type { FilterAxis } from './filter-config-schema'
import { getProduktConfig } from './produkt-config'

/** DB `filter_axes` wins when non-empty; otherwise code defaults from produkt-config. */
export function resolveFilterAxes(
  typ: string | null | undefined,
  dbAxes?: FilterAxis[] | null,
): FilterAxis[] {
  if (dbAxes && dbAxes.length > 0) return dbAxes
  return getProduktConfig(typ).filter_axes
}

/** Select options for LeadForm — excludes the „Egal“ null option. */
export function getWartezeitFormOptions(typ: string | null | undefined): Array<{
  value: number
  label: string
}> {
  const axis = resolveFilterAxes(typ, null).find(a => a.key === 'wartezeit_monate')
  if (!axis) return []
  return axis.options
    .filter((o): o is { value: number; label: string } => typeof o.value === 'number')
}
