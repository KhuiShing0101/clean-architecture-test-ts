/**
 * OrderId Value Object - Lesson 4
 *
 * Unique identifier for Order aggregate.
 * Uses UUID format for global uniqueness.
 */

import { v4 as uuidv4 } from 'uuid';

export class OrderId {
  private constructor(private readonly value: string) {
    this.validateFormat();
  }

  /**
   * Create OrderId from existing value
   * @param value - UUID string
   * @returns OrderId instance
   */
  static create(value: string): OrderId {
    return new OrderId(value);
  }

  /**
   * Generate a new random OrderId
   * @returns OrderId instance with new UUID
   */
  static generate(): OrderId {
    return new OrderId(uuidv4());
  }

  /**
   * Get the string value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Compare with another OrderId
   */
  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Validate UUID format
   * @private
   */
  private validateFormat(): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(this.value)) {
      throw new Error('OrderId must be a valid UUID v4');
    }
  }
}
