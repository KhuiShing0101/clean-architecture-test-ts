/**
 * Event Handler Interface - Lesson 5
 *
 * Handlers react to domain events.
 * Each handler is responsible for one specific reaction.
 *
 * Example Handlers:
 * - ReserveInventoryHandler (reacts to OrderPlacedEvent)
 * - SendOrderConfirmationHandler (reacts to OrderPlacedEvent)
 * - ReleaseInventoryHandler (reacts to OrderCancelledEvent)
 */

import { IDomainEvent } from './IDomainEvent';

export interface IEventHandler<T extends IDomainEvent> {
  /**
   * Handle the domain event
   * @param event - The domain event to handle
   */
  handle(event: T): Promise<void>;

  /**
   * Get the event type this handler subscribes to
   */
  getEventType(): string;
}
