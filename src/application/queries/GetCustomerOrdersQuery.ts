/**
 * Get Customer Orders Query - Lesson 6
 *
 * Query to fetch all orders for a customer with pagination.
 * Optimized for list views with minimal data.
 *
 * Demonstrates:
 * - Pagination for large result sets
 * - Lightweight DTOs for list views
 * - Sorting and filtering
 */

import { IQuery } from './IQuery';
import { IQueryHandler } from './IQueryHandler';

/**
 * Query Input
 */
export class GetCustomerOrdersQuery implements IQuery<PagedOrderListView> {
  constructor(
    public readonly customerId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 10,
    public readonly status?: string, // Filter by status
    public readonly sortBy: 'createdAt' | 'totalAmount' = 'createdAt',
    public readonly sortOrder: 'asc' | 'desc' = 'desc'
  ) {}
}

/**
 * Lightweight Read Model for List Views
 *
 * Minimal data for displaying order lists.
 * More detailed data fetched via GetOrderByIdQuery when needed.
 */
export interface OrderSummaryView {
  orderId: string;
  orderNumber: string;
  status: string;
  statusDisplayName: string;
  totalAmount: number;
  totalItems: number;
  currency: string;
  createdAt: string;
  placedAt: string | null;
}

/**
 * Paged Result
 */
export interface PagedOrderListView {
  items: OrderSummaryView[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Query Handler
 */
export class GetCustomerOrdersQueryHandler
  implements IQueryHandler<GetCustomerOrdersQuery, PagedOrderListView>
{
  constructor(private readonly prisma: any) {}

  async handle(query: GetCustomerOrdersQuery): Promise<PagedOrderListView> {
    // Build where clause
    const where: any = {
      customerId: query.customerId,
    };

    if (query.status) {
      where.status = query.status;
    }

    // Count total items (for pagination)
    const totalCount = await this.prisma.order.count({ where });

    // Calculate pagination
    const skip = (query.page - 1) * query.pageSize;
    const totalPages = Math.ceil(totalCount / query.pageSize);

    // Fetch orders with pagination and sorting
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            quantity: true, // Only select quantity for counting
          },
        },
      },
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip,
      take: query.pageSize,
    });

    // Transform to read model
    const items: OrderSummaryView[] = orders.map((order: any) => ({
      orderId: order.id,
      orderNumber: this.generateOrderNumber(order.id, order.createdAt),
      status: order.status,
      statusDisplayName: this.getStatusDisplayName(order.status),
      totalAmount: order.totalAmount,
      totalItems: order.items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      ),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      placedAt: order.placedAt?.toISOString() || null,
    }));

    return {
      items,
      totalCount,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
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
