/**
 * Order Aggregate Root - Lesson 4
 *
 * Demonstrates the Aggregate Pattern in DDD.
 * The Order is the aggregate root that controls access to OrderItems.
 *
 * Key Aggregate Concepts:
 * - Single Entry Point: All modifications go through the Order root
 * - Consistency Boundary: Order ensures all invariants are maintained
 * - Child Entity Protection: OrderItems cannot be modified directly
 * - Transaction Boundary: One transaction per aggregate
 * - Immutability: All operations return new instances
 *
 * Business Rules:
 * - Order must have at least one item to be placed
 * - Total amount must match sum of item subtotals
 * - Order can only be modified in DRAFT status
 * - Status transitions must follow state machine rules
 * - Items cannot be negative quantity
 */

import { OrderId } from '../valueObjects/OrderId';
import { OrderStatus, OrderStatusValue } from '../valueObjects/OrderStatus';
import { Money } from '../valueObjects/Money';
import { OrderItem } from './OrderItem';

/**
 * Order Aggregate Root
 *
 * This is the ONLY way to access and modify OrderItems.
 * OrderItems are child entities protected within the aggregate.
 */
export class Order {
  /**
   * Private constructor enforces factory method usage
   * Aggregate roots should always validate their state
   */
  private constructor(
    private readonly _id: OrderId,
    private readonly _customerId: string,
    private readonly _items: readonly OrderItem[],
    private readonly _total: Money,
    private readonly _status: OrderStatus,
    private readonly _createdAt: Date,
    private readonly _placedAt: Date | null,
    private readonly _completedAt: Date | null,
    private readonly _cancelledAt: Date | null
  ) {
    this.validateInvariants();
  }

  /**
   * Create a new Order (factory method)
   *
   * Initial state:
   * - DRAFT status
   * - Empty items
   * - Zero total
   *
   * @param customerId - User ID who owns this order
   * @param currency - Currency for order (default: JPY)
   * @returns New Order instance in DRAFT state
   */
  static create(customerId: string, currency: string = 'JPY'): Order {
    return new Order(
      OrderId.generate(),
      customerId,
      [], // Empty items initially
      Money.zero(currency), // Zero total
      OrderStatus.draft(),
      new Date(),
      null,
      null,
      null
    );
  }

  /**
   * Reconstruct Order from persistence (factory method)
   *
   * Used by repository when loading from database.
   * Does NOT create new instance - reconstructs existing one.
   *
   * @param id - Existing order ID
   * @param customerId - Customer ID
   * @param items - Order items
   * @param total - Total amount
   * @param status - Current status
   * @param createdAt - Creation timestamp
   * @param placedAt - Placement timestamp
   * @param completedAt - Completion timestamp
   * @param cancelledAt - Cancellation timestamp
   * @returns Reconstructed Order instance
   */
  static reconstruct(
    id: OrderId,
    customerId: string,
    items: OrderItem[],
    total: Money,
    status: OrderStatus,
    createdAt: Date,
    placedAt: Date | null,
    completedAt: Date | null,
    cancelledAt: Date | null
  ): Order {
    return new Order(
      id,
      customerId,
      items,
      total,
      status,
      createdAt,
      placedAt,
      completedAt,
      cancelledAt
    );
  }

  // ========================================
  // Getters (Public API - Read Only)
  // ========================================

  get id(): OrderId {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  /**
   * Get all items (read-only)
   * Returns copy to prevent external modification
   */
  get items(): readonly OrderItem[] {
    return [...this._items];
  }

  get total(): Money {
    return this._total;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get placedAt(): Date | null {
    return this._placedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get cancelledAt(): Date | null {
    return this._cancelledAt;
  }

  // ========================================
  // Commands (Public API - Modify State)
  // ========================================

  /**
   * Add item to order (IMMUTABLE)
   *
   * Business Rules:
   * - Can only add items to DRAFT orders
   * - If item already exists, increase quantity
   * - Total must be recalculated
   *
   * @param bookId - Book identifier
   * @param quantity - Number of books
   * @param unitPrice - Price per book
   * @returns New Order instance with added item
   * @throws Error if order cannot be modified
   */
  addItem(bookId: string, quantity: number, unitPrice: Money): Order {
    if (!this.canModify()) {
      throw new Error(`Cannot add items to order in ${this._status.getValue()} status`);
    }

    // Check if item already exists
    const existingItemIndex = this._items.findIndex(
      (item) => item.bookId === bookId
    );

    let newItems: OrderItem[];

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const existingItem = this._items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      const updatedItem = OrderItem.create(bookId, newQuantity, unitPrice);

      newItems = [
        ...this._items.slice(0, existingItemIndex),
        updatedItem,
        ...this._items.slice(existingItemIndex + 1),
      ];
    } else {
      // Add new item
      const newItem = OrderItem.create(bookId, quantity, unitPrice);
      newItems = [...this._items, newItem];
    }

    // Recalculate total from items
    const newTotal = this.calculateTotalFromItems(newItems);

    return new Order(
      this._id,
      this._customerId,
      newItems,
      newTotal,
      this._status,
      this._createdAt,
      this._placedAt,
      this._completedAt,
      this._cancelledAt
    );
  }

  /**
   * Remove item from order (IMMUTABLE)
   *
   * Business Rules:
   * - Can only remove items from DRAFT orders
   * - Total must be recalculated
   *
   * @param bookId - Book identifier to remove
   * @returns New Order instance without the item
   * @throws Error if order cannot be modified or item not found
   */
  removeItem(bookId: string): Order {
    if (!this.canModify()) {
      throw new Error(`Cannot remove items from order in ${this._status.getValue()} status`);
    }

    const itemIndex = this._items.findIndex((item) => item.bookId === bookId);

    if (itemIndex < 0) {
      throw new Error(`Item not found in order: ${bookId}`);
    }

    // Remove item
    const newItems = [
      ...this._items.slice(0, itemIndex),
      ...this._items.slice(itemIndex + 1),
    ];

    // Recalculate total
    const newTotal = this.calculateTotalFromItems(newItems);

    return new Order(
      this._id,
      this._customerId,
      newItems,
      newTotal,
      this._status,
      this._createdAt,
      this._placedAt,
      this._completedAt,
      this._cancelledAt
    );
  }

  /**
   * Update item quantity (IMMUTABLE)
   *
   * Business Rules:
   * - Can only update DRAFT orders
   * - Quantity must be positive
   *
   * @param bookId - Book identifier
   * @param newQuantity - New quantity
   * @returns New Order instance with updated item
   * @throws Error if order cannot be modified or item not found
   */
  updateItemQuantity(bookId: string, newQuantity: number): Order {
    if (!this.canModify()) {
      throw new Error(`Cannot update items in order with ${this._status.getValue()} status`);
    }

    const itemIndex = this._items.findIndex((item) => item.bookId === bookId);

    if (itemIndex < 0) {
      throw new Error(`Item not found in order: ${bookId}`);
    }

    const existingItem = this._items[itemIndex];
    const updatedItem = OrderItem.create(bookId, newQuantity, existingItem.unitPrice);

    const newItems = [
      ...this._items.slice(0, itemIndex),
      updatedItem,
      ...this._items.slice(itemIndex + 1),
    ];

    const newTotal = this.calculateTotalFromItems(newItems);

    return new Order(
      this._id,
      this._customerId,
      newItems,
      newTotal,
      this._status,
      this._createdAt,
      this._placedAt,
      this._completedAt,
      this._cancelledAt
    );
  }

  /**
   * Place the order (state transition: DRAFT → PLACED)
   *
   * Business Rules:
   * - Order must have at least one item
   * - Order must be in DRAFT status
   * - Status must allow transition to PLACED
   *
   * @returns New Order instance in PLACED status
   * @throws Error if order cannot be placed
   */
  place(): Order {
    if (!this.canPlace()) {
      throw new Error('Order cannot be placed: must have at least one item');
    }

    const newStatus = OrderStatus.placed();

    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition: ${this._status.getValue()} → ${newStatus.getValue()}`
      );
    }

    return new Order(
      this._id,
      this._customerId,
      this._items,
      this._total,
      newStatus,
      this._createdAt,
      new Date(), // Set placement timestamp
      this._completedAt,
      this._cancelledAt
    );
  }

  /**
   * Complete the order (state transition: PLACED → COMPLETED)
   *
   * Business Rules:
   * - Order must be in PLACED status
   * - Status must allow transition to COMPLETED
   *
   * @returns New Order instance in COMPLETED status
   * @throws Error if order cannot be completed
   */
  complete(): Order {
    const newStatus = OrderStatus.completed();

    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition: ${this._status.getValue()} → ${newStatus.getValue()}`
      );
    }

    return new Order(
      this._id,
      this._customerId,
      this._items,
      this._total,
      newStatus,
      this._createdAt,
      this._placedAt,
      new Date(), // Set completion timestamp
      this._cancelledAt
    );
  }

  /**
   * Cancel the order (state transition: DRAFT/PLACED → CANCELLED)
   *
   * Business Rules:
   * - Order can be cancelled from DRAFT or PLACED status
   * - Status must allow transition to CANCELLED
   *
   * @returns New Order instance in CANCELLED status
   * @throws Error if order cannot be cancelled
   */
  cancel(): Order {
    const newStatus = OrderStatus.cancelled();

    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition: ${this._status.getValue()} → ${newStatus.getValue()}`
      );
    }

    return new Order(
      this._id,
      this._customerId,
      this._items,
      this._total,
      newStatus,
      this._createdAt,
      this._placedAt,
      this._completedAt,
      new Date() // Set cancellation timestamp
    );
  }

  // ========================================
  // Queries (Public API - Business Logic)
  // ========================================

  /**
   * Check if order can be placed
   *
   * Requirements:
   * - Must have at least one item
   * - Must be in DRAFT status
   */
  canPlace(): boolean {
    return this._items.length > 0 && this._status.isDraft();
  }

  /**
   * Check if order can be modified (add/remove items)
   *
   * Requirement:
   * - Must be in DRAFT status
   */
  canModify(): boolean {
    return this._status.isDraft();
  }

  /**
   * Get total number of items (sum of quantities)
   */
  getTotalItemCount(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ========================================
  // Private Methods (Internal Logic)
  // ========================================

  /**
   * Validate aggregate invariants
   *
   * Invariants that must ALWAYS be true:
   * - Total must equal sum of item subtotals
   * - Cannot have negative quantities
   * - Placed orders must have placement timestamp
   * - Completed orders must have completion timestamp
   * - Cancelled orders must have cancellation timestamp
   *
   * @private
   */
  private validateInvariants(): void {
    // Validate total matches sum of items
    const calculatedTotal = this.calculateTotalFromItems(this._items);
    if (!this._total.equals(calculatedTotal)) {
      throw new Error(
        `Order total (${this._total.toString()}) does not match sum of items (${calculatedTotal.toString()})`
      );
    }

    // Validate status timestamps
    if (this._status.isPlaced() && !this._placedAt) {
      throw new Error('PLACED order must have placedAt timestamp');
    }

    if (this._status.isCompleted() && !this._completedAt) {
      throw new Error('COMPLETED order must have completedAt timestamp');
    }

    if (this._status.isCancelled() && !this._cancelledAt) {
      throw new Error('CANCELLED order must have cancelledAt timestamp');
    }
  }

  /**
   * Calculate total from items
   *
   * This is the single source of truth for order total calculation.
   * Ensures consistency across the aggregate.
   *
   * @param items - Order items to sum
   * @returns Total money value
   * @private
   */
  private calculateTotalFromItems(items: readonly OrderItem[]): Money {
    if (items.length === 0) {
      // Return zero in the same currency as existing total
      // Or default to JPY for new orders
      return this._total ? Money.zero(this._total.getCurrency()) : Money.zero('JPY');
    }

    // Sum all item subtotals
    return items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero(items[0].unitPrice.getCurrency())
    );
  }
}
