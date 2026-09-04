const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Zet een vrije tekst om naar een URL-vriendelijke slug
 * (kleine letters, cijfers en koppeltekens).
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
