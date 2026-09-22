/**
 * Cities come from the DB stored in fixed UPPERCASE (legacy geographic catalog, unrelated to the
 * `UppercasesAttributes` free-text rule). Display-only: lowercases the name and capitalizes just
 * the first letter, so it reads like the rest of the page instead of sustained caps.
 */
export function formatCityName(name: string): string {
  const lower = name.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
