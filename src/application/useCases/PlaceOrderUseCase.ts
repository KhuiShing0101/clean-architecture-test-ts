/**
 * Place Order Use Case - Lesson 4
 *
 * Demonstrates aggregate state transitions.
 * State transition logic is encapsulated in the Order aggregate.
 *
 * Application Layer Responsibilities:
 * - Find Order aggregate
 * - Validate order exists
 * - Delegate to aggregate method
 * - Save modified aggregate
 * - Transform to DTO
 *
 * Domain Logic (handled by Order aggregate):
 * - Validate order can be placed (has items)
 * - Validate status transition (DRAFT → PLACED)
 * - Update status and timestamp
 * - Maintain invariants
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderId } from '../../domain/valueObjects/OrderId';

/**
 * Input DTO for Place Order Use Case
 */
export interface PlaceOrderInput {
  orderId: string; // Order UUID
}

/**
 * Output DTO for Place Order Use Case
 */
export interface PlaceOrderOutput {
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
    placedAt: Date | null;
  };
}

/**
 * Place Order Use Case
 *
 * Transitions order from DRAFT to PLACED status.
 * Demonstrates aggregate state management.
 */
export class PlaceOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Execute place order use case
   *
   * Application Flow:
   * 1. Find order aggregate (application concern)
   * 2. Place order (domain logic via aggregate)
   * 3. Save modified aggregate (infrastructure concern)
   * 4. Transform to DTO (application concern)
   *
   * @param input - Place order input
   * @returns Result with placed order DTO
   */
  async execute(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    try {
      // Step 1: Find order aggregate
      const orderId = OrderId.create(input.orderId);
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return {
          success: false,
          message: `Order not found: ${input.orderId}`,
        };
      }

      // Step 2: Place order (domain logic via aggregate root)
      // The aggregate enforces:
      // - Order must have at least one item
      // - Order must be in DRAFT status
      // - Status transition must be valid
      const placedOrder = order.place();

      // Step 3: Save modified aggregate
      await this.orderRepository.save(placedOrder);

      // Step 4: Transform to DTO
      return {
        success: true,
        message: 'Order placed successfully',
        order: {
          orderId: placedOrder.id.getValue(),
          customerId: placedOrder.customerId,
          status: placedOrder.status.getValue(),
          total: {
            amount: placedOrder.total.getAmount(),
            currency: placedOrder.total.getCurrency(),
          },
          itemCount: placedOrder.getTotalItemCount(),
          createdAt: placedOrder.createdAt,
          placedAt: placedOrder.placedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to place order',
      };
    }
  }
}
