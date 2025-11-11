/**
 * Lesson 5 Demo - Domain Events
 *
 * This file demonstrates how domain events work in practice.
 * Run this to see the event-driven architecture in action.
 *
 * Flow:
 * 1. Create order
 * 2. Add items to order
 * 3. Place order → triggers OrderPlacedEvent
 * 4. Event handlers react:
 *    - ReserveInventoryHandler
 *    - SendOrderConfirmationHandler
 */

import { InMemoryEventBus } from '../infrastructure/events/InMemoryEventBus';
import { ReserveInventoryHandler } from '../application/eventHandlers/ReserveInventoryHandler';
import { SendOrderConfirmationHandler } from '../application/eventHandlers/SendOrderConfirmationHandler';
import { ReleaseInventoryHandler } from '../application/eventHandlers/ReleaseInventoryHandler';
import { Order } from '../domain/aggregates/Order';
import { Money } from '../domain/valueObjects/Money';
import { OrderPlacedEvent } from '../domain/events/OrderPlacedEvent';
import { OrderCancelledEvent } from '../domain/events/OrderCancelledEvent';

/**
 * Demo: Order Placed Event
 */
async function demoOrderPlaced() {
  console.log('='.repeat(70));
  console.log('LESSON 5 DEMO: Domain Events - Order Placed');
  console.log('='.repeat(70));

  // Step 1: Create event bus
  const eventBus = new InMemoryEventBus();

  // Step 2: Register event handlers
  console.log('\n📋 Registering event handlers...\n');
  eventBus.subscribe(new ReserveInventoryHandler());
  eventBus.subscribe(new SendOrderConfirmationHandler());

  // Step 3: Create an order
  console.log('\n🛒 Creating order...\n');
  const order = Order.create('customer-123', 'JPY');

  // Step 4: Add items to order
  const updatedOrder = order
    .addItem('book-001', 2, Money.create(1500, 'JPY'))
    .addItem('book-002', 1, Money.create(2000, 'JPY'));

  console.log(`   Order ${updatedOrder.id.getValue()}`);
  console.log(`   Customer: ${updatedOrder.customerId}`);
  console.log(`   Items: ${updatedOrder.getTotalItemCount()}`);
  console.log(`   Total: ${updatedOrder.total.toString()}`);

  // Step 5: Place the order
  console.log('\n📦 Placing order...\n');
  const placedOrder = updatedOrder.place();

  // Step 6: Publish domain event
  console.log('🚀 Publishing OrderPlacedEvent...\n');
  const event = new OrderPlacedEvent(
    placedOrder.id.getValue(),
    placedOrder.customerId,
    placedOrder.items.map((item) => ({
      bookId: item.bookId,
      quantity: item.quantity,
      unitPrice: {
        amount: item.unitPrice.getAmount(),
        currency: item.unitPrice.getCurrency(),
      },
    })),
    {
      amount: placedOrder.total.getAmount(),
      currency: placedOrder.total.getCurrency(),
    }
  );

  await eventBus.publish(event);

  console.log('\n✅ Order placed successfully!');
  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Demo: Order Cancelled Event
 */
async function demoOrderCancelled() {
  console.log('='.repeat(70));
  console.log('LESSON 5 DEMO: Domain Events - Order Cancelled');
  console.log('='.repeat(70));

  // Step 1: Create event bus
  const eventBus = new InMemoryEventBus();

  // Step 2: Register event handlers
  console.log('\n📋 Registering event handlers...\n');
  eventBus.subscribe(new ReleaseInventoryHandler());

  // Step 3: Simulate order cancellation
  console.log('\n❌ Cancelling order...\n');

  const event = new OrderCancelledEvent(
    'order-123',
    'customer-456',
    'PLACED',
    'Customer requested cancellation'
  );

  await eventBus.publish(event);

  console.log('\n✅ Order cancelled successfully!');
  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Demo: Multiple Events
 */
async function demoMultipleEvents() {
  console.log('='.repeat(70));
  console.log('LESSON 5 DEMO: Multiple Events in Sequence');
  console.log('='.repeat(70));

  const eventBus = new InMemoryEventBus();

  // Register all handlers
  eventBus.subscribe(new ReserveInventoryHandler());
  eventBus.subscribe(new SendOrderConfirmationHandler());
  eventBus.subscribe(new ReleaseInventoryHandler());

  // Event 1: Order placed
  console.log('\n[1/2] Order placed...\n');
  const placedEvent = new OrderPlacedEvent(
    'order-789',
    'customer-999',
    [
      {
        bookId: 'book-001',
        quantity: 3,
        unitPrice: { amount: 1500, currency: 'JPY' },
      },
    ],
    { amount: 4500, currency: 'JPY' }
  );

  await eventBus.publish(placedEvent);

  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Event 2: Order cancelled
  console.log('\n[2/2] Order cancelled...\n');
  const cancelledEvent = new OrderCancelledEvent(
    'order-789',
    'customer-999',
    'PLACED',
    'Payment failed'
  );

  await eventBus.publish(cancelledEvent);

  console.log('\n✅ Demo complete!');
  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Run all demos
 */
async function runAllDemos() {
  await demoOrderPlaced();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await demoOrderCancelled();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await demoMultipleEvents();
}

// Export for use
export { demoOrderPlaced, demoOrderCancelled, demoMultipleEvents, runAllDemos };

// Run if executed directly
if (require.main === module) {
  runAllDemos().catch(console.error);
}
