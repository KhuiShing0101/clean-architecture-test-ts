/**
 * Get Order Statistics Query - Lesson 6
 *
 * Query to fetch aggregated order statistics for analytics/dashboards.
 * Demonstrates CQRS benefits for complex read operations.
 *
 * In production, this could:
 * - Use materialized views for performance
 * - Use separate analytics database (ClickHouse, BigQuery)
 * - Use pre-calculated aggregations updated by events
 * - Use caching (Redis) for frequently accessed data
 */

import { IQuery } from './IQuery';
import { IQueryHandler } from './IQueryHandler';

/**
 * Query Input
 */
export class GetOrderStatisticsQuery implements IQuery<OrderStatisticsView> {
  constructor(
    public readonly customerId?: string, // Optional: stats for specific customer
    public readonly startDate?: Date, // Optional: date range
    public readonly endDate?: Date
  ) {}
}

/**
 * Statistics Read Model
 *
 * Aggregated data optimized for dashboards.
 */
export interface OrderStatisticsView {
  // Overall statistics
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  currency: string;

  // Status breakdown
  ordersByStatus: {
    draft: number;
    placed: number;
    completed: number;
    cancelled: number;
  };

  // Recent trends
  recentOrders: {
    last7Days: number;
    last30Days: number;
  };

  // Top items
  topBooks: Array<{
    bookId: string;
    bookTitle: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;

  // Timeline data (for charts)
  ordersByMonth: Array<{
    month: string; // "2024-01"
    count: number;
    revenue: number;
  }>;
}

/**
 * Query Handler
 */
export class GetOrderStatisticsQueryHandler
  implements IQueryHandler<GetOrderStatisticsQuery, OrderStatisticsView>
{
  constructor(private readonly prisma: any) {}

  async handle(query: GetOrderStatisticsQuery): Promise<OrderStatisticsView> {
    // Build date range filter
    const dateFilter: any = {};
    if (query.startDate) {
      dateFilter.gte = query.startDate;
    }
    if (query.endDate) {
      dateFilter.lte = query.endDate;
    }

    // Build where clause
    const where: any = {};
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Fetch all orders for statistics
    // In production, use database aggregation queries
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
      },
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (o: any) => o.status === 'COMPLETED'
    );
    const totalRevenue = completedOrders.reduce(
      (sum: number, o: any) => sum + o.totalAmount,
      0
    );
    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Count by status
    const ordersByStatus = {
      draft: orders.filter((o: any) => o.status === 'DRAFT').length,
      placed: orders.filter((o: any) => o.status === 'PLACED').length,
      completed: orders.filter((o: any) => o.status === 'COMPLETED').length,
      cancelled: orders.filter((o: any) => o.status === 'CANCELLED').length,
    };

    // Recent trends
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentOrders = {
      last7Days: orders.filter((o: any) => o.createdAt >= last7Days).length,
      last30Days: orders.filter((o: any) => o.createdAt >= last30Days).length,
    };

    // Top books (aggregate items across all orders)
    const bookStats = new Map<
      string,
      { bookId: string; totalQuantity: number; totalRevenue: number }
    >();

    for (const order of orders) {
      if (order.status !== 'COMPLETED') continue; // Only count completed orders

      for (const item of order.items) {
        const existing = bookStats.get(item.bookId) || {
          bookId: item.bookId,
          totalQuantity: 0,
          totalRevenue: 0,
        };

        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.subtotalAmount;

        bookStats.set(item.bookId, existing);
      }
    }

    const topBooks = Array.from(bookStats.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5)
      .map((stat) => ({
        bookId: stat.bookId,
        bookTitle: `Book ${stat.bookId}`, // TODO: Fetch from books table
        totalQuantity: stat.totalQuantity,
        totalRevenue: stat.totalRevenue,
      }));

    // Orders by month (for timeline charts)
    const monthlyStats = new Map<string, { count: number; revenue: number }>();

    for (const order of orders) {
      const month = order.createdAt.toISOString().substring(0, 7); // "2024-01"
      const existing = monthlyStats.get(month) || { count: 0, revenue: 0 };

      existing.count += 1;
      if (order.status === 'COMPLETED') {
        existing.revenue += order.totalAmount;
      }

      monthlyStats.set(month, existing);
    }

    const ordersByMonth = Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month,
        count: stats.count,
        revenue: stats.revenue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      currency: orders[0]?.currency || 'JPY',
      ordersByStatus,
      recentOrders,
      topBooks,
      ordersByMonth,
    };
  }
}
