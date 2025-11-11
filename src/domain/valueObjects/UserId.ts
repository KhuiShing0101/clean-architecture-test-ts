/**
 * UserId Value Object
 *
 * Represents a user identifier as a value object.
 * Demonstrates immutability and validation patterns for value objects.
 *
 * Key Characteristics:
 * - Immutable by design
 * - Defined by attributes (value), not identity
 * - Self-validating (8-digit requirement)
 * - Can be compared by value
 */

export class UserId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Create a UserId from an existing value
   * @param value - 8-digit string
   * @returns UserId instance
   * @throws Error if value is not 8 digits
   */
  static create(value: string): UserId {
    if (!value || value.length !== 8 || !/^\d{8}$/.test(value)) {
      throw new Error('UserId must be exactly 8 digits');
    }
    return new UserId(value);
  }

  /**
   * Generate a random 8-digit UserId
   * @returns New UserId instance
   */
  static generate(): UserId {
    const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    return new UserId(randomId);
  }

  /**
   * Get the string value of this UserId
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Compare this UserId with another for equality
   * Value objects are compared by value, not identity
   */
  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }
}
