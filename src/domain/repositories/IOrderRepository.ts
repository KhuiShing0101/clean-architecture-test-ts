/**
 * Order Repository Interface - Lesson 4
 *
 * Repository for Order aggregate.
 * Defines persistence contract for the domain layer.
 *
 * Key Points:
 * - Works with Order aggregate root only (not OrderItems directly)
 * - One transaction per aggregate
 * - Save/load entire aggregate as unit
 * - Domain layer owns this interface
 * - Infrastructure layer implements it
 */

import { Order } from '../aggregates/Order';
import { OrderId } from '../valueObjects/OrderId';

export interface IOrderRepository {
  /**
   * Save Order aggregate (insert or update)
   *
   * Transaction Boundary:
   * - Saves Order and all OrderItems in single transaction
   * - Ensures aggregate consistency
   *
   * @param order - Complete Order aggregate to save
   */
  save(order: Order): Promise<void>;

  /**
   * Find Order by ID
   *
   * @param id - Order identifier
   * @returns Order aggregate with all items, or null if not found
   */
  findById(id: OrderId): Promise<Order | null>;

  /**
   * Find all orders for a customer
   *
   * @param customerId - Customer identifier
   * @returns Array of Order aggregates
   */
  findByCustomerId(customerId: string): Promise<Order[]>;

  /**
   * Delete Order aggregate
   *
   * @param id - Order identifier
   */
  delete(id: OrderId): Promise<void>;
}
