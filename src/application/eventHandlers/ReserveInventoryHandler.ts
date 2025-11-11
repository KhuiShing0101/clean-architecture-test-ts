/**
 * Reserve Inventory Handler - Lesson 5
 *
 * Reacts to OrderPlacedEvent by reserving inventory.
 * Demonstrates:
 * - Event-driven architecture
 * - Decoupling between Order and Inventory aggregates
 * - Eventual consistency
 *
 * In a real system:
 * - This would call an Inventory aggregate/service
 * - It might publish its own events (InventoryReservedEvent)
 * - It would handle failures and compensating transactions
 */

import { IEventHandler } from '../../domain/events/IEventHandler';
import { OrderPlacedEvent } from '../../domain/events/OrderPlacedEvent';

export class ReserveInventoryHandler implements IEventHandler<OrderPlacedEvent> {
  getEventType(): string {
    return 'OrderPlaced';
  }

  async handle(event: OrderPlacedEvent): Promise<void> {
    console.log(`\n📦 [InventoryService] Handling OrderPlacedEvent`);
    console.log(`   Order ID: ${event.aggregateId}`);
    console.log(`   Customer ID: ${event.customerId}`);
    console.log(`   Items to reserve: ${event.items.length}`);

    // In real implementation:
    // 1. Load Inventory aggregate for each book
    // 2. Check if stock is available
    // 3. Reserve the stock
    // 4. Save Inventory aggregate
    // 5. Publish InventoryReservedEvent or InventoryInsufficientEvent

    for (const item of event.items) {
      console.log(`   - Reserving ${item.quantity}x Book ${item.bookId}`);

      // Simulate inventory reservation
      await this.simulateInventoryReservation(
        item.bookId,
        item.quantity
      );
    }

    console.log(`✅ [InventoryService] Inventory reserved for order ${event.aggregateId}`);
  }

  /**
   * Simulate inventory reservation (placeholder)
   */
  private async simulateInventoryReservation(
    bookId: string,
    quantity: number
  ): Promise<void> {
    // In real implementation:
    // const inventory = await inventoryRepository.findByBookId(bookId);
    // const updated = inventory.reserve(quantity);
    // await inventoryRepository.save(updated);

    // For now, just simulate delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Log the action
    console.log(`      Reserved ${quantity} units of book ${bookId}`);
  }
}
