/** `value` when it's a path on this site (so a ?next= link can't send viewers elsewhere), else null */
export function localPath(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : null
}
