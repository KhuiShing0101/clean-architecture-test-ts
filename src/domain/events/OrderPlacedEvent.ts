/**
 * Order Placed Event - Lesson 5
 *
 * Emitted when an order transitions from DRAFT to PLACED.
 * Other parts of the system can react to this event.
 *
 * Example Reactions:
 * - Inventory Service: Reserve stock for order items
 * - Notification Service: Send confirmation email to customer
 * - Payment Service: Initiate payment processing
 * - Analytics Service: Track order metrics
 */

import { v4 as uuidv4 } from 'uuid';
import { IDomainEvent } from './IDomainEvent';

export interface OrderItem {
  bookId: string;
  quantity: number;
  unitPrice: {
    amount: number;
    currency: string;
  };
}

export class OrderPlacedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType: string = 'OrderPlaced';
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly version: number = 1;

  // Event-specific data
  readonly customerId: string;
  readonly items: readonly OrderItem[];
  readonly totalAmount: {
    amount: number;
    currency: string;
  };

  constructor(
    orderId: string,
    customerId: string,
    items: OrderItem[],
    totalAmount: { amount: number; currency: string }
  ) {
    this.eventId = uuidv4();
    this.aggregateId = orderId;
    this.customerId = customerId;
    this.items = [...items]; // Immutable copy
    this.totalAmount = { ...totalAmount };
    this.occurredOn = new Date();
  }

  /**
   * Get event data for logging/persistence
   */
  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredOn: this.occurredOn.toISOString(),
      aggregateId: this.aggregateId,
      version: this.version,
      data: {
        customerId: this.customerId,
        items: this.items,
        totalAmount: this.totalAmount,
      },
    };
  }
}
