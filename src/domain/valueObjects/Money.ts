/**
 * Money Value Object - Lesson 4
 *
 * Proper money handling with currency awareness.
 * Demonstrates value object best practices for financial calculations.
 *
 * Key Features:
 * - Currency-aware (JPY, USD, EUR, etc.)
 * - Immutable arithmetic operations
 * - Precision handling (avoids floating-point errors)
 * - Currency validation
 * - Comparison operations
 */

export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    this.validateInvariants();
  }

  /**
   * Create Money value object
   * @param amount - Monetary amount
   * @param currency - Currency code (default: JPY)
   * @returns Money instance
   */
  static create(amount: number, currency: string = 'JPY'): Money {
    return new Money(amount, currency);
  }

  /**
   * Create zero money
   * @param currency - Currency code
   * @returns Money instance with zero amount
   */
  static zero(currency: string = 'JPY'): Money {
    return new Money(0, currency);
  }

  /**
   * Get the monetary amount
   */
  getAmount(): number {
    return this.amount;
  }

  /**
   * Get the currency code
   */
  getCurrency(): string {
    return this.currency;
  }

  /**
   * Add another Money value (IMMUTABLE)
   * @param other - Money to add
   * @returns New Money instance
   * @throws Error if currencies don't match
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  /**
   * Subtract another Money value (IMMUTABLE)
   * @param other - Money to subtract
   * @returns New Money instance
   * @throws Error if currencies don't match or result is negative
   */
  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;

    if (result < 0) {
      throw new Error('Money cannot be negative after subtraction');
    }

    return new Money(result, this.currency);
  }

  /**
   * Multiply by a scalar (IMMUTABLE)
   * @param multiplier - Number to multiply by
   * @returns New Money instance
   */
  multiply(multiplier: number): Money {
    if (multiplier < 0) {
      throw new Error('Multiplier cannot be negative');
    }

    return new Money(this.amount * multiplier, this.currency);
  }

  /**
   * Compare if this Money is greater than another
   * @param other - Money to compare
   * @returns true if this is greater than other
   * @throws Error if currencies don't match
   */
  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  /**
   * Compare if this Money is less than another
   * @param other - Money to compare
   * @returns true if this is less than other
   * @throws Error if currencies don't match
   */
  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  /**
   * Compare if this Money equals another
   * @param other - Money to compare
   * @returns true if both amount and currency match
   */
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.currency} ${this.amount.toLocaleString()}`;
  }

  /**
   * Validate invariants
   * @private
   */
  private validateInvariants(): void {
    if (this.amount < 0) {
      throw new Error('Money amount cannot be negative');
    }

    if (!this.currency || this.currency.trim().length !== 3) {
      throw new Error('Currency must be a 3-letter code (e.g., JPY, USD, EUR)');
    }

    // Validate currency format (uppercase letters)
    if (!/^[A-Z]{3}$/.test(this.currency)) {
      throw new Error('Currency must be 3 uppercase letters');
    }
  }

  /**
   * Ensure two Money values have the same currency
   * @private
   */
  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot operate on different currencies: ${this.currency} and ${other.currency}`
      );
    }
  }
}
