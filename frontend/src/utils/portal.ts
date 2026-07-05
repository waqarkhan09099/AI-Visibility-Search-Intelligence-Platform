/** Portal target for Radix overlays — keeps dropdowns above app stacking contexts. */
export function getDropdownPortalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined
  return document.getElementById('radix-dropdown-portal') ?? document.body
}
