/**
 * Domain Event Interface - Lesson 5
 *
 * Base interface for all domain events.
 * Domain events represent something that happened in the domain.
 *
 * Key Characteristics:
 * - Named in past tense (OrderPlaced, BookBorrowed)
 * - Immutable (what happened cannot change)
 * - Contains all data needed by handlers
 * - Has timestamp of when it occurred
 * - Has unique event ID for tracking
 */

export interface IDomainEvent {
  /**
   * Unique identifier for this event instance
   */
  readonly eventId: string;

  /**
   * Type of event (e.g., "OrderPlaced", "OrderCancelled")
   */
  readonly eventType: string;

  /**
   * When the event occurred
   */
  readonly occurredOn: Date;

  /**
   * ID of the aggregate that raised this event
   */
  readonly aggregateId: string;

  /**
   * Version of the event schema (for event evolution)
   */
  readonly version: number;
}
