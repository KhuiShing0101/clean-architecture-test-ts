/**
 * ISBN Value Object
 *
 * Represents an ISBN (International Standard Book Number) with validation.
 * Supports both ISBN-10 and ISBN-13 formats.
 */
export class ISBN {
  private readonly value: string;

  constructor(value: string) {
    const cleaned = this.cleanISBN(value);

    if (!this.isValid(cleaned)) {
      throw new Error('Invalid ISBN format');
    }

    this.value = cleaned;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ISBN): boolean {
    return this.value === other.value;
  }

  private cleanISBN(isbn: string): string {
    // Remove hyphens and spaces
    return isbn.replace(/[-\s]/g, '');
  }

  private isValid(isbn: string): boolean {
    if (isbn.length === 10) {
      return this.validateISBN10(isbn);
    }
    if (isbn.length === 13) {
      return this.validateISBN13(isbn);
    }
    return false;
  }

  /**
   * Validate ISBN-10 format with check digit
   */
  private validateISBN10(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const char = isbn[i];
      if (!/^\d$/.test(char)) return false;
      sum += parseInt(char) * (10 - i);
    }

    const lastChar = isbn[9];
    sum += lastChar === 'X' ? 10 : parseInt(lastChar);

    return sum % 11 === 0;
  }

  /**
   * Validate ISBN-13 format with check digit
   */
  private validateISBN13(isbn: string): boolean {
    // Must start with 978 or 979
    if (!isbn.startsWith('978') && !isbn.startsWith('979')) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const char = isbn[i];
      if (!/^\d$/.test(char)) return false;
      const digit = parseInt(char);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(isbn[12]);
  }

  toString(): string {
    return this.value;
  }
}
