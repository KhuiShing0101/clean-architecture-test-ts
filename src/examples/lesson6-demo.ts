/**
 * Lesson 6 Demo - CQRS (Command Query Responsibility Segregation)
 *
 * This file demonstrates the separation between:
 * - Commands (write operations that change state)
 * - Queries (read operations that return data)
 *
 * Benefits:
 * - Independent optimization of reads and writes
 * - Scalability (scale reads and writes independently)
 * - Flexibility (different storage for reads and writes)
 * - Performance (optimized read models)
 */

import { Order } from '../domain/aggregates/Order';
import { Money } from '../domain/valueObjects/Money';
import {
  GetOrderByIdQuery,
  GetOrderByIdQueryHandler,
} from '../application/queries/GetOrderByIdQuery';
import {
  GetCustomerOrdersQuery,
  GetCustomerOrdersQueryHandler,
} from '../application/queries/GetCustomerOrdersQuery';
import {
  GetOrderStatisticsQuery,
  GetOrderStatisticsQueryHandler,
} from '../application/queries/GetOrderStatisticsQuery';

/**
 * Demo: CQRS Pattern in Action
 */
async function demoCQRS() {
  console.log('='.repeat(70));
  console.log('LESSON 6 DEMO: CQRS - Commands vs Queries');
  console.log('='.repeat(70));

  // ============================================================
  // WRITE SIDE: Commands (Change State)
  // ============================================================

  console.log('\n📝 WRITE SIDE: Commands (State Changes)\n');
  console.log('─'.repeat(70));

  // Command 1: Create Order
  console.log('\n[Command] CreateOrder');
  const order = Order.create('customer-123', 'JPY');
  console.log(`  ✓ Order created: ${order.id.getValue()}`);
  console.log(`  Status: ${order.status.getValue()}`);
  console.log(`  Total: ${order.total.toString()}`);

  // Command 2: Add Items
  console.log('\n[Command] AddItemToOrder');
  const orderWithItems = order
    .addItem('book-001', 2, Money.create(1500, 'JPY'))
    .addItem('book-002', 1, Money.create(2000, 'JPY'));
  console.log(`  ✓ Added 2 items`);
  console.log(`  Total: ${orderWithItems.total.toString()}`);

  // Command 3: Place Order
  console.log('\n[Command] PlaceOrder');
  const placedOrder = orderWithItems.place();
  console.log(`  ✓ Order placed`);
  console.log(`  Status: DRAFT → ${placedOrder.status.getValue()}`);

  // Save to database (write model)
  console.log('\n💾 Saving to Write Model (aggregate)...');
  // await orderRepository.save(placedOrder);
  console.log('  ✓ Aggregate saved to database');

  // ============================================================
  // READ SIDE: Queries (Read State)
  // ============================================================

  console.log('\n\n📖 READ SIDE: Queries (State Reading)\n');
  console.log('─'.repeat(70));

  // Mock Prisma for demo
  const mockPrisma = createMockPrisma(placedOrder);

  // Query 1: Get Order Detail
  console.log('\n[Query] GetOrderById');
  console.log('  Purpose: Display order details page');
  console.log('  Optimization: Denormalized with JOINs\n');

  const getOrderQuery = new GetOrderByIdQuery(placedOrder.id.getValue());
  const orderQueryHandler = new GetOrderByIdQueryHandler(mockPrisma);
  const orderDetail = await orderQueryHandler.handle(getOrderQuery);

  if (orderDetail) {
    console.log(`  Order Number: ${orderDetail.orderNumber}`);
    console.log(`  Customer: ${orderDetail.customer.customerName}`);
    console.log(`  Status: ${orderDetail.statusDisplayName}`);
    console.log(`  Items: ${orderDetail.items.length}`);
    console.log(`  Total: ¥${orderDetail.totalAmount.toLocaleString()}`);
    console.log(`  Can be cancelled: ${orderDetail.canBeCancelled ? 'Yes' : 'No'}`);
  }

  // Query 2: Get Customer Orders (List)
  console.log('\n[Query] GetCustomerOrders');
  console.log('  Purpose: Display customer order history');
  console.log('  Optimization: Pagination, minimal data\n');

  const getCustomerOrdersQuery = new GetCustomerOrdersQuery(
    'customer-123',
    1,
    10
  );
  const customerOrdersHandler = new GetCustomerOrdersQueryHandler(mockPrisma);
  const customerOrders = await customerOrdersHandler.handle(
    getCustomerOrdersQuery
  );

  console.log(`  Found ${customerOrders.totalCount} orders`);
  console.log(`  Page ${customerOrders.page} of ${customerOrders.totalPages}`);
  console.log(`  Items on this page: ${customerOrders.items.length}`);

  for (const item of customerOrders.items) {
    console.log(`    - ${item.orderNumber}: ${item.statusDisplayName} (¥${item.totalAmount.toLocaleString()})`);
  }

  // Query 3: Get Statistics
  console.log('\n[Query] GetOrderStatistics');
  console.log('  Purpose: Dashboard analytics');
  console.log('  Optimization: Aggregations, caching\n');

  const getStatsQuery = new GetOrderStatisticsQuery('customer-123');
  const statsHandler = new GetOrderStatisticsQueryHandler(mockPrisma);
  const stats = await statsHandler.handle(getStatsQuery);

  console.log(`  Total Orders: ${stats.totalOrders}`);
  console.log(`  Total Revenue: ¥${stats.totalRevenue.toLocaleString()}`);
  console.log(`  Average Order Value: ¥${stats.averageOrderValue.toLocaleString()}`);
  console.log(`\n  Orders by Status:`);
  console.log(`    Draft: ${stats.ordersByStatus.draft}`);
  console.log(`    Placed: ${stats.ordersByStatus.placed}`);
  console.log(`    Completed: ${stats.ordersByStatus.completed}`);
  console.log(`    Cancelled: ${stats.ordersByStatus.cancelled}`);

  // ============================================================
  // Comparison: Command vs Query
  // ============================================================

  console.log('\n\n⚖️  COMPARISON: Commands vs Queries\n');
  console.log('─'.repeat(70));

  console.log('\nCOMMANDS (Write Side):');
  console.log('  • Change state (create, update, delete)');
  console.log('  • Use domain aggregates (Order, OrderItem)');
  console.log('  • Enforce business rules');
  console.log('  • Return success/failure');
  console.log('  • Write to normalized database');
  console.log('  • Example: PlaceOrder, AddItem, CancelOrder\n');

  console.log('QUERIES (Read Side):');
  console.log('  • Read state (no changes)');
  console.log('  • Use denormalized read models');
  console.log('  • Optimized for display');
  console.log('  • Return data/DTOs');
  console.log('  • Can use read replicas, caches, views');
  console.log('  • Example: GetOrderDetail, GetCustomerOrders, GetStatistics\n');

  console.log('\n✅ Demo complete!');
  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Create mock Prisma for demonstration
 */
function createMockPrisma(order: Order) {
  return {
    order: {
      findUnique: async ({ where }: any) => {
        if (where.id !== order.id.getValue()) return null;

        return {
          id: order.id.getValue(),
          customerId: order.customerId,
          totalAmount: order.total.getAmount(),
          currency: order.total.getCurrency(),
          status: order.status.getValue(),
          createdAt: order.createdAt,
          placedAt: order.placedAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
          items: order.items.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.getAmount(),
            currency: item.unitPrice.getCurrency(),
            subtotalAmount: item.subtotal.getAmount(),
          })),
        };
      },

      findMany: async ({ where, skip, take }: any) => {
        // Return single order for demo
        const orderData = {
          id: order.id.getValue(),
          customerId: order.customerId,
          totalAmount: order.total.getAmount(),
          currency: order.total.getCurrency(),
          status: order.status.getValue(),
          createdAt: order.createdAt,
          placedAt: order.placedAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
          items: order.items.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.getAmount(),
            currency: item.unitPrice.getCurrency(),
            subtotalAmount: item.subtotal.getAmount(),
          })),
        };

        return [orderData];
      },

      count: async () => 1,
    },
  };
}

// Export for use
export { demoCQRS };

// Run if executed directly
if (require.main === module) {
  demoCQRS().catch(console.error);
}
