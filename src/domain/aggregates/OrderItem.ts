/**
 * OrderItem Entity - Lesson 4
 *
 * Child entity within the Order aggregate.
 * Can ONLY be accessed through the Order aggregate root.
 *
 * Key Characteristics:
 * - Has identity (bookId within the order)
 * - Cannot exist outside Order aggregate
 * - No direct repository access
 * - Part of Order's consistency boundary
 * - Immutable by design
 */

import { Money } from '../valueObjects/Money';

export class OrderItem {
  private constructor(
    private readonly _bookId: string,
    private readonly _quantity: number,
    private readonly _unitPrice: Money,
    private readonly _subtotal: Money
  ) {
    this.validateInvariants();
  }

  /**
   * Create a new OrderItem
   * @param bookId - Book identifier
   * @param quantity - Quantity of books
   * @param unitPrice - Price per book
   * @returns OrderItem instance
   */
  static create(bookId: string, quantity: number, unitPrice: Money): OrderItem {
    const subtotal = unitPrice.multiply(quantity);
    return new OrderItem(bookId, quantity, unitPrice, subtotal);
  }

  /**
   * Reconstruct OrderItem from persistence
   * Used by repository when loading from database
   *
   * @param bookId - Book identifier
   * @param quantity - Quantity
   * @param unitPrice - Unit price
   * @param subtotal - Subtotal (pre-calculated)
   * @returns Reconstructed OrderItem
   */
  static reconstruct(
    bookId: string,
    quantity: number,
    unitPrice: Money,
    subtotal: Money
  ): OrderItem {
    return new OrderItem(bookId, quantity, unitPrice, subtotal);
  }

  // Public getters (property accessors for convenience)
  get bookId(): string {
    return this._bookId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get subtotal(): Money {
    return this._subtotal;
  }

  /**
   * Get the book ID
   */
  getBookId(): string {
    return this._bookId;
  }

  /**
   * Get the quantity
   */
  getQuantity(): number {
    return this._quantity;
  }

  /**
   * Get the unit price
   */
  getUnitPrice(): Money {
    return this._unitPrice;
  }

  /**
   * Get the subtotal (unit price * quantity)
   */
  getSubtotal(): Money {
    return this._subtotal;
  }

  /**
   * Update quantity (IMMUTABLE)
   * Returns a NEW OrderItem instance
   *
   * @param newQuantity - New quantity
   * @returns New OrderItem with updated quantity
   */
  updateQuantity(newQuantity: number): OrderItem {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    return OrderItem.create(this._bookId, newQuantity, this._unitPrice);
  }

  /**
   * Check if this item is for a specific book
   */
  isForBook(bookId: string): boolean {
    return this._bookId === bookId;
  }

  /**
   * Validate invariants
   * @private
   */
  private validateInvariants(): void {
    if (this._quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (this._unitPrice.getAmount() < 0) {
      throw new Error('Unit price cannot be negative');
    }

    if (this._subtotal.getAmount() < 0) {
      throw new Error('Subtotal cannot be negative');
    }

    // Verify subtotal calculation
    const expectedSubtotal = this._unitPrice.multiply(this._quantity);
    if (!this._subtotal.equals(expectedSubtotal)) {
      throw new Error('Subtotal does not match unit price * quantity');
    }
  }
}
