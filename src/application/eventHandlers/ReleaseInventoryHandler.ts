/**
 * Release Inventory Handler - Lesson 5
 *
 * Reacts to OrderCancelledEvent by releasing reserved inventory.
 * Demonstrates:
 * - Compensating transactions
 * - Event-driven rollback
 * - Different handlers for different events
 */

import { IEventHandler } from '../../domain/events/IEventHandler';
import { OrderCancelledEvent } from '../../domain/events/OrderCancelledEvent';

export class ReleaseInventoryHandler implements IEventHandler<OrderCancelledEvent> {
  getEventType(): string {
    return 'OrderCancelled';
  }

  async handle(event: OrderCancelledEvent): Promise<void> {
    console.log(`\n📦 [InventoryService] Handling OrderCancelledEvent`);
    console.log(`   Order ID: ${event.aggregateId}`);
    console.log(`   Customer ID: ${event.customerId}`);
    console.log(`   Previous Status: ${event.previousStatus}`);
    console.log(`   Reason: ${event.reason || 'Not specified'}`);

    // Only release inventory if order was PLACED
    // (DRAFT orders never reserved inventory)
    if (event.previousStatus === 'PLACED') {
      console.log(`   Releasing reserved inventory...`);

      // In real implementation:
      // 1. Load Order aggregate to get items
      // 2. For each item, load Inventory aggregate
      // 3. Release the reserved stock
      // 4. Save Inventory aggregate
      // 5. Publish InventoryReleasedEvent

      await this.simulateInventoryRelease(event.aggregateId);

      console.log(`✅ [InventoryService] Inventory released for order ${event.aggregateId}`);
    } else {
      console.log(`   No inventory to release (order was ${event.previousStatus})`);
    }
  }

  /**
   * Simulate inventory release (placeholder)
   */
  private async simulateInventoryRelease(orderId: string): Promise<void> {
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`      Released inventory for order ${orderId}`);
  }
}
