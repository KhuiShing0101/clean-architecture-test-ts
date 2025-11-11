/**
 * In-Memory Event Bus - Lesson 5 (Infrastructure Layer)
 *
 * Simple implementation of IEventBus using in-memory handlers.
 * In production, you might use:
 * - RabbitMQ
 * - Apache Kafka
 * - AWS EventBridge
 * - Azure Service Bus
 * - Google Cloud Pub/Sub
 *
 * This implementation is synchronous for simplicity.
 * In production, events are typically processed asynchronously.
 */

import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { IEventHandler } from '../../domain/events/IEventHandler';
import { IEventBus } from '../../domain/events/IEventBus';

export class InMemoryEventBus implements IEventBus {
  // Map of event type -> array of handlers
  private handlers: Map<string, IEventHandler<any>[]> = new Map();

  /**
   * Publish a domain event to all subscribed handlers
   */
  async publish(event: IDomainEvent): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.handlers.get(eventType) || [];

    console.log(`📢 Publishing event: ${eventType} (${handlers.length} handlers)`);

    // Execute all handlers for this event type
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        // Log error but don't fail the entire publish
        // In production, you'd use proper error handling/retry logic
        console.error(
          `❌ Error in handler for ${eventType}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  /**
   * Publish multiple events
   */
  async publishAll(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribe a handler to events
   */
  subscribe(handler: IEventHandler<any>): void {
    const eventType = handler.getEventType();

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);

    console.log(`✅ Subscribed handler to ${eventType}`);
  }

  /**
   * Unsubscribe a handler
   */
  unsubscribe(handler: IEventHandler<any>): void {
    const eventType = handler.getEventType();
    const handlers = this.handlers.get(eventType);

    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        console.log(`❌ Unsubscribed handler from ${eventType}`);
      }
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearHandlers(): void {
    this.handlers.clear();
    console.log(`🗑️  Cleared all event handlers`);
  }

  /**
   * Get handler count for debugging
   */
  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
