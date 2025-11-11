/**
 * OrderStatus Value Object - Lesson 4
 *
 * Type-safe order status with valid transition rules.
 * Demonstrates state machine pattern within a value object.
 *
 * Valid State Transitions:
 * - DRAFT → PLACED or CANCELLED
 * - PLACED → COMPLETED or CANCELLED
 * - COMPLETED → (terminal state)
 * - CANCELLED → (terminal state)
 */

export enum OrderStatusValue {
  DRAFT = 'DRAFT',
  PLACED = 'PLACED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class OrderStatus {
  private constructor(private readonly value: OrderStatusValue) {}

  /**
   * Create draft status (initial state)
   */
  static draft(): OrderStatus {
    return new OrderStatus(OrderStatusValue.DRAFT);
  }

  /**
   * Create placed status
   */
  static placed(): OrderStatus {
    return new OrderStatus(OrderStatusValue.PLACED);
  }

  /**
   * Create completed status
   */
  static completed(): OrderStatus {
    return new OrderStatus(OrderStatusValue.COMPLETED);
  }

  /**
   * Create cancelled status
   */
  static cancelled(): OrderStatus {
    return new OrderStatus(OrderStatusValue.CANCELLED);
  }

  /**
   * Create from string value
   * @param value - Status value string
   */
  static fromString(value: string): OrderStatus {
    const statusValue = OrderStatusValue[value as keyof typeof OrderStatusValue];
    if (!statusValue) {
      throw new Error(`Invalid order status: ${value}`);
    }
    return new OrderStatus(statusValue);
  }

  /**
   * Get the status value
   */
  getValue(): OrderStatusValue {
    return this.value;
  }

  /**
   * Check if this status can transition to another status
   * Implements state machine rules
   *
   * @param newStatus - Target status
   * @returns true if transition is valid
   */
  canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatusValue, OrderStatusValue[]> = {
      [OrderStatusValue.DRAFT]: [
        OrderStatusValue.PLACED,
        OrderStatusValue.CANCELLED,
      ],
      [OrderStatusValue.PLACED]: [
        OrderStatusValue.COMPLETED,
        OrderStatusValue.CANCELLED,
      ],
      [OrderStatusValue.COMPLETED]: [], // Terminal state
      [OrderStatusValue.CANCELLED]: [], // Terminal state
    };

    return transitions[this.value].includes(newStatus.value);
  }

  /**
   * Check if status is DRAFT
   */
  isDraft(): boolean {
    return this.value === OrderStatusValue.DRAFT;
  }

  /**
   * Check if status is PLACED
   */
  isPlaced(): boolean {
    return this.value === OrderStatusValue.PLACED;
  }

  /**
   * Check if status is COMPLETED
   */
  isCompleted(): boolean {
    return this.value === OrderStatusValue.COMPLETED;
  }

  /**
   * Check if status is CANCELLED
   */
  isCancelled(): boolean {
    return this.value === OrderStatusValue.CANCELLED;
  }

  /**
   * Check if this is a terminal state (cannot transition further)
   */
  isTerminal(): boolean {
    return this.isCompleted() || this.isCancelled();
  }

  /**
   * Compare with another OrderStatus
   */
  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }
}
