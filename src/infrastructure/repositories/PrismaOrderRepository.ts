/**
 * Prisma Order Repository - Lesson 4
 *
 * Infrastructure implementation of IOrderRepository.
 * Demonstrates aggregate persistence with Prisma ORM.
 *
 * Key Points:
 * - Saves entire aggregate as a unit
 * - One transaction per aggregate
 * - Transforms between domain and persistence models
 * - Uses Prisma's cascade delete for aggregate consistency
 *
 * Aggregate Boundary:
 * - Order + OrderItems are saved/loaded together
 * - Cannot modify OrderItems directly
 * - Transaction ensures consistency
 */

import { PrismaClient } from '../../generated/prisma';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order } from '../../domain/aggregates/Order';
import { OrderItem } from '../../domain/aggregates/OrderItem';
import { OrderId } from '../../domain/valueObjects/OrderId';
import { OrderStatus, OrderStatusValue } from '../../domain/valueObjects/OrderStatus';
import { Money } from '../../domain/valueObjects/Money';

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Save Order aggregate (insert or update)
   *
   * Transaction Strategy:
   * 1. Delete all existing OrderItems (if update)
   * 2. Upsert Order
   * 3. Insert all OrderItems
   *
   * This ensures aggregate consistency - all or nothing.
   *
   * @param order - Complete Order aggregate
   */
  async save(order: Order): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const orderId = order.id.getValue();

      // Step 1: Delete existing items (if any)
      // This is necessary because we treat the aggregate as a unit
      await tx.orderItem.deleteMany({
        where: { orderId },
      });

      // Step 2: Upsert Order (insert or update)
      await tx.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          customerId: order.customerId,
          totalAmount: order.total.getAmount(),
          currency: order.total.getCurrency(),
          status: order.status.getValue() as any,
          createdAt: order.createdAt,
          placedAt: order.placedAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
        },
        update: {
          customerId: order.customerId,
          totalAmount: order.total.getAmount(),
          currency: order.total.getCurrency(),
          status: order.status.getValue() as any,
          placedAt: order.placedAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
        },
      });

      // Step 3: Insert all items
      if (order.items.length > 0) {
        await tx.orderItem.createMany({
          data: order.items.map((item) => ({
            orderId: orderId,
            bookId: item.bookId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.getAmount(),
            currency: item.unitPrice.getCurrency(),
            subtotalAmount: item.subtotal.getAmount(),
          })),
        });
      }
    });
  }

  /**
   * Find Order by ID
   *
   * Loads entire aggregate:
   * - Order root
   * - All OrderItems
   *
   * @param id - Order identifier
   * @returns Complete Order aggregate or null
   */
  async findById(id: OrderId): Promise<Order | null> {
    const orderData = await this.prisma.order.findUnique({
      where: { id: id.getValue() },
      include: {
        items: true, // Load all items with the order
      },
    });

    if (!orderData) {
      return null;
    }

    // Reconstruct OrderItems
    const items = orderData.items.map((itemData) =>
      OrderItem.reconstruct(
        itemData.bookId,
        itemData.quantity,
        Money.create(itemData.unitPrice, itemData.currency),
        Money.create(itemData.subtotalAmount, itemData.currency)
      )
    );

    // Reconstruct Order aggregate
    return Order.reconstruct(
      OrderId.create(orderData.id),
      orderData.customerId,
      items,
      Money.create(orderData.totalAmount, orderData.currency),
      OrderStatus.fromString(orderData.status),
      orderData.createdAt,
      orderData.placedAt,
      orderData.completedAt,
      orderData.cancelledAt
    );
  }

  /**
   * Find all orders for a customer
   *
   * @param customerId - Customer identifier
   * @returns Array of complete Order aggregates
   */
  async findByCustomerId(customerId: string): Promise<Order[]> {
    const ordersData = await this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return ordersData.map((orderData) => {
      const items = orderData.items.map((itemData) =>
        OrderItem.reconstruct(
          itemData.bookId,
          itemData.quantity,
          Money.create(itemData.unitPrice, itemData.currency),
          Money.create(itemData.subtotalAmount, itemData.currency)
        )
      );

      return Order.reconstruct(
        OrderId.create(orderData.id),
        orderData.customerId,
        items,
        Money.create(orderData.totalAmount, orderData.currency),
        OrderStatus.fromString(orderData.status),
        orderData.createdAt,
        orderData.placedAt,
        orderData.completedAt,
        orderData.cancelledAt
      );
    });
  }

  /**
   * Delete Order aggregate
   *
   * Cascade delete will automatically remove all OrderItems
   * (configured in Prisma schema with onDelete: Cascade)
   *
   * @param id - Order identifier
   */
  async delete(id: OrderId): Promise<void> {
    await this.prisma.order.delete({
      where: { id: id.getValue() },
    });
  }
}
