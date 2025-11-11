/**
 * Get Order By ID Query - Lesson 6
 *
 * Query to fetch complete order details by ID.
 * Uses optimized read model with denormalized data.
 *
 * Read Model vs Write Model:
 * - Write Model: Order aggregate (Lesson 4)
 * - Read Model: OrderDetailView (denormalized, optimized for display)
 */

import { IQuery } from './IQuery';
import { IQueryHandler } from './IQueryHandler';

/**
 * Query Input
 */
export class GetOrderByIdQuery implements IQuery<OrderDetailView | null> {
  constructor(public readonly orderId: string) {}
}

/**
 * Query Result - Optimized Read Model
 *
 * Denormalized for fast reads:
 * - Includes customer name (not just ID)
 * - Includes book titles (not just IDs)
 * - Pre-calculated totals
 * - Formatted dates
 */
export interface OrderDetailView {
  orderId: string;
  orderNumber: string; // Human-readable order number (e.g., "ORD-2024-001")

  // Customer info (denormalized)
  customer: {
    customerId: string;
    customerName: string;
    customerEmail: string;
  };

  // Order status
  status: string;
  statusDisplayName: string; // "Draft", "Placed", "Completed", "Cancelled"

  // Items (denormalized with book details)
  items: Array<{
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    currency: string;
  }>;

  // Totals
  totalAmount: number;
  totalItems: number;
  currency: string;

  // Timestamps (formatted)
  createdAt: string; // ISO 8601
  placedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;

  // Computed fields
  canBeCancelled: boolean;
  canBeModified: boolean;
  isCompleted: boolean;
}

/**
 * Query Handler
 *
 * Fetches order details using optimized read operations.
 * Can use database views, read replicas, or caches.
 */
export class GetOrderByIdQueryHandler
  implements IQueryHandler<GetOrderByIdQuery, OrderDetailView | null>
{
  constructor(
    private readonly prisma: any // In real app, inject read-optimized repository
  ) {}

  async handle(query: GetOrderByIdQuery): Promise<OrderDetailView | null> {
    // Fetch order with all related data in single query
    // (optimized with JOINs for read performance)
    const order = await this.prisma.order.findUnique({
      where: { id: query.orderId },
      include: {
        items: true,
        // In real app, also JOIN with books and users tables
      },
    });

    if (!order) {
      return null;
    }

    // Transform to read model
    // In real app, fetch customer and book details
    return {
      orderId: order.id,
      orderNumber: this.generateOrderNumber(order.id, order.createdAt),

      customer: {
        customerId: order.customerId,
        customerName: `Customer ${order.customerId}`, // TODO: Fetch from user table
        customerEmail: `customer-${order.customerId}@example.com`, // TODO: Fetch from user table
      },

      status: order.status,
      statusDisplayName: this.getStatusDisplayName(order.status),

      items: order.items.map((item: any) => ({
        bookId: item.bookId,
        bookTitle: `Book ${item.bookId}`, // TODO: Fetch from books table
        bookAuthor: 'Unknown Author', // TODO: Fetch from books table
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotalAmount,
        currency: item.currency,
      })),

      totalAmount: order.totalAmount,
      totalItems: order.items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      ),
      currency: order.currency,

      createdAt: order.createdAt.toISOString(),
      placedAt: order.placedAt?.toISOString() || null,
      completedAt: order.completedAt?.toISOString() || null,
      cancelledAt: order.cancelledAt?.toISOString() || null,

      canBeCancelled:
        order.status === 'DRAFT' || order.status === 'PLACED',
      canBeModified: order.status === 'DRAFT',
      isCompleted: order.status === 'COMPLETED',
    };
  }

  private generateOrderNumber(id: string, createdAt: Date): string {
    const date = createdAt.toISOString().split('T')[0].replace(/-/g, '');
    const shortId = id.substring(0, 8).toUpperCase();
    return `ORD-${date}-${shortId}`;
  }

  private getStatusDisplayName(status: string): string {
    const displayNames: Record<string, string> = {
      DRAFT: '下書き',
      PLACED: '注文済み',
      COMPLETED: '完了',
      CANCELLED: 'キャンセル',
    };
    return displayNames[status] || status;
  }
}
