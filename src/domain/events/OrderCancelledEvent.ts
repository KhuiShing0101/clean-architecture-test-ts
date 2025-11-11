/**
 * Order Cancelled Event - Lesson 5
 *
 * Emitted when an order is cancelled.
 *
 * Example Reactions:
 * - Inventory Service: Release reserved stock
 * - Notification Service: Send cancellation email
 * - Payment Service: Initiate refund if payment was made
 * - Analytics Service: Track cancellation metrics
 */

import { v4 as uuidv4 } from 'uuid';
import { IDomainEvent } from './IDomainEvent';

export class OrderCancelledEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType: string = 'OrderCancelled';
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly version: number = 1;

  // Event-specific data
  readonly customerId: string;
  readonly reason?: string;
  readonly previousStatus: string; // Was it DRAFT or PLACED?

  constructor(
    orderId: string,
    customerId: string,
    previousStatus: string,
    reason?: string
  ) {
    this.eventId = uuidv4();
    this.aggregateId = orderId;
    this.customerId = customerId;
    this.previousStatus = previousStatus;
    this.reason = reason;
    this.occurredOn = new Date();
  }

  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredOn: this.occurredOn.toISOString(),
      aggregateId: this.aggregateId,
      version: this.version,
      data: {
        customerId: this.customerId,
        previousStatus: this.previousStatus,
        reason: this.reason,
      },
    };
  }
}
