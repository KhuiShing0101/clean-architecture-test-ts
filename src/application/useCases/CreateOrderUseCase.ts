/**
 * Create Order Use Case - Lesson 4
 *
 * Application-level orchestration for creating orders.
 * Demonstrates working with aggregates at the application layer.
 *
 * Application Layer Responsibilities:
 * - Input validation and transformation
 * - Coordinate with repository
 * - Transform domain result to DTO
 * - Handle application-level errors
 *
 * Domain Logic (handled by Order aggregate):
 * - Create order in valid initial state
 * - Enforce aggregate invariants
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order } from '../../domain/aggregates/Order';

/**
 * Input DTO for Create Order Use Case
 */
export interface CreateOrderInput {
  customerId: string; // User ID who owns the order
  currency?: string; // Optional currency (default: JPY)
}

/**
 * Output DTO for Create Order Use Case
 */
export interface CreateOrderOutput {
  success: boolean;
  message: string;
  order?: {
    orderId: string;
    customerId: string;
    status: string;
    total: {
      amount: number;
      currency: string;
    };
    itemCount: number;
    createdAt: Date;
  };
}

/**
 * Create Order Use Case
 *
 * Creates a new order in DRAFT status.
 * Order starts empty - items can be added via AddItemToOrderUseCase.
 */
export class CreateOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Execute create order use case
   *
   * Application Flow:
   * 1. Validate input (application concern)
   * 2. Create Order aggregate (domain logic)
   * 3. Save to repository (infrastructure concern)
   * 4. Transform to DTO (application concern)
   *
   * @param input - Order creation input
   * @returns Creation result with DTO
   */
  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    try {
      // Step 1: Validate input
      if (!input.customerId || input.customerId.trim().length === 0) {
        return {
          success: false,
          message: 'Customer ID is required',
        };
      }

      // Step 2: Create Order aggregate (domain logic)
      const order = Order.create(input.customerId, input.currency);

      // Step 3: Save to repository
      await this.orderRepository.save(order);

      // Step 4: Transform to DTO
      return {
        success: true,
        message: 'Order created successfully',
        order: {
          orderId: order.id.getValue(),
          customerId: order.customerId,
          status: order.status.getValue(),
          total: {
            amount: order.total.getAmount(),
            currency: order.total.getCurrency(),
          },
          itemCount: order.getTotalItemCount(),
          createdAt: order.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }
}
