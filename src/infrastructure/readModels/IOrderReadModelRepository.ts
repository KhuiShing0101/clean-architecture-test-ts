/**
 * Order Read Model Repository - Lesson 6
 *
 * Separate repository for read operations.
 * Can be optimized differently from write repository.
 *
 * Key Differences from Write Repository:
 * - Write Repository: Loads/saves aggregates
 * - Read Repository: Returns denormalized DTOs
 *
 * Optimizations:
 * - Can use database views
 * - Can use read replicas
 * - Can use caching (Redis)
 * - Can use different storage (Elasticsearch for search)
 * - Can be eventually consistent
 */

export interface IOrderReadModelRepository {
  /**
   * Find order detail for display
   * Returns denormalized data with all related information
   */
  findOrderDetail(orderId: string): Promise<OrderDetailDTO | null>;

  /**
   * Find orders for customer with pagination
   */
  findCustomerOrders(
    customerId: string,
    page: number,
    pageSize: number,
    status?: string
  ): Promise<{
    items: OrderSummaryDTO[];
    totalCount: number;
  }>;

  /**
   * Get order statistics
   */
  getOrderStatistics(
    customerId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OrderStatisticsDTO>;

  /**
   * Search orders by various criteria
   * (Could use Elasticsearch for full-text search)
   */
  searchOrders(searchTerm: string, page: number, pageSize: number): Promise<{
    items: OrderSummaryDTO[];
    totalCount: number;
  }>;
}

/**
 * DTOs for Read Models
 */
export interface OrderDetailDTO {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  statusDisplayName: string;
  items: OrderItemDTO[];
  totalAmount: number;
  totalItems: number;
  currency: string;
  createdAt: Date;
  placedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  canBeCancelled: boolean;
  canBeModified: boolean;
}

export interface OrderItemDTO {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  currency: string;
}

export interface OrderSummaryDTO {
  orderId: string;
  orderNumber: string;
  status: string;
  statusDisplayName: string;
  totalAmount: number;
  totalItems: number;
  currency: string;
  createdAt: Date;
  placedAt: Date | null;
}

export interface OrderStatisticsDTO {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  currency: string;
  ordersByStatus: {
    draft: number;
    placed: number;
    completed: number;
    cancelled: number;
  };
  recentOrders: {
    last7Days: number;
    last30Days: number;
  };
  topBooks: Array<{
    bookId: string;
    bookTitle: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  ordersByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
}
