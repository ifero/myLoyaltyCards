/**
 * Initials Generation Utility
 * Story 2.4: Display Virtual Logo (AC2)
 *
 * Generates initials from a card name for the Virtual Logo component.
 */

/**
 * Generate initials from a card name
 *
 * Rules:
 * - Split by whitespace
 * - Take first letter of each word
 * - Maximum 3 initials
 * - Uppercase
 *
 * @example
 * generateInitials("Test Store") // "TS"
 * generateInitials("SuperMart") // "S"
 * generateInitials("The Coffee Shop") // "TCS"
 * generateInitials("A Very Long Store Name Here") // "AVL"
 * generateInitials("") // "?"
 */
export function generateInitials(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    return '?';
  }

  const words = trimmed.split(/\s+/);
  const initials = words
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}
