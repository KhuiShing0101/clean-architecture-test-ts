/**
 * Event Bus Interface - Lesson 5
 *
 * Central hub for publishing and subscribing to domain events.
 * Decouples event publishers from event handlers.
 *
 * Pattern: Publish-Subscribe (Pub/Sub)
 * - Publishers don't know who's listening
 * - Handlers don't know who published
 * - New handlers can be added without modifying publishers
 */

import { IDomainEvent } from './IDomainEvent';
import { IEventHandler } from './IEventHandler';

export interface IEventBus {
  /**
   * Publish a domain event to all subscribed handlers
   * @param event - The domain event to publish
   */
  publish(event: IDomainEvent): Promise<void>;

  /**
   * Publish multiple domain events
   * @param events - Array of domain events to publish
   */
  publishAll(events: IDomainEvent[]): Promise<void>;

  /**
   * Subscribe a handler to a specific event type
   * @param handler - The event handler to register
   */
  subscribe(handler: IEventHandler<any>): void;

  /**
   * Unsubscribe a handler from events
   * @param handler - The event handler to remove
   */
  unsubscribe(handler: IEventHandler<any>): void;

  /**
   * Clear all event handlers (useful for testing)
   */
  clearHandlers(): void;
}
