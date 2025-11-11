/**
 * Add Item to Order Use Case - Lesson 4
 *
 * Demonstrates aggregate modification through the root.
 * All item operations must go through the Order aggregate root.
 *
 * Application Layer Responsibilities:
 * - Find Order aggregate by ID
 * - Validate order exists
 * - Delegate to aggregate method
 * - Save modified aggregate
 * - Transform to DTO
 *
 * Domain Logic (handled by Order aggregate):
 * - Validate order can be modified
 * - Add or update item
 * - Recalculate total
 * - Maintain invariants
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { OrderId } from '../../domain/valueObjects/OrderId';
import { Money } from '../../domain/valueObjects/Money';

/**
 * Input DTO for Add Item to Order Use Case
 */
export interface AddItemToOrderInput {
  orderId: string; // Order UUID
  bookId: string; // Book UUID
  quantity: number; // Number of books to add
}

/**
 * Output DTO for Add Item to Order Use Case
 */
export interface AddItemToOrderOutput {
  success: boolean;
  message: string;
  order?: {
    orderId: string;
    customerId: string;
    status: string;
    items: Array<{
      bookId: string;
      bookTitle: string;
      quantity: number;
      unitPrice: {
        amount: number;
        currency: string;
      };
      subtotal: {
        amount: number;
        currency: string;
      };
    }>;
    total: {
      amount: number;
      currency: string;
    };
    itemCount: number;
  };
}

/**
 * Add Item to Order Use Case
 *
 * Adds items to an existing order.
 * Demonstrates aggregate modification pattern.
 */
export class AddItemToOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly bookRepository: IBookRepository
  ) {}

  /**
   * Execute add item to order use case
   *
   * Application Flow:
   * 1. Find order (application concern)
   * 2. Find book to get price (application concern)
   * 3. Add item to order (domain logic via aggregate)
   * 4. Save modified aggregate (infrastructure concern)
   * 5. Transform to DTO (application concern)
   *
   * @param input - Add item input
   * @returns Result with updated order DTO
   */
  async execute(input: AddItemToOrderInput): Promise<AddItemToOrderOutput> {
    try {
      // Step 1: Validate input
      if (input.quantity <= 0) {
        return {
          success: false,
          message: 'Quantity must be positive',
        };
      }

      // Step 2: Find order aggregate
      const orderId = OrderId.create(input.orderId);
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return {
          success: false,
          message: `Order not found: ${input.orderId}`,
        };
      }

      // Step 3: Find book (to get price and validate existence)
      const book = await this.bookRepository.findById(input.bookId);

      if (!book) {
        return {
          success: false,
          message: `Book not found: ${input.bookId}`,
        };
      }

      // Assuming book has a price property (you may need to add this to Book entity)
      // For now, let's use a default price
      const currency = order.total.getCurrency();
      const unitPrice = Money.create(1500, currency); // Default ¥1,500 per book

      // Step 4: Add item to order (domain logic via aggregate root)
      const updatedOrder = order.addItem(input.bookId, input.quantity, unitPrice);

      // Step 5: Save modified aggregate
      await this.orderRepository.save(updatedOrder);

      // Step 6: Transform to DTO
      return {
        success: true,
        message: 'Item added to order successfully',
        order: {
          orderId: updatedOrder.id.getValue(),
          customerId: updatedOrder.customerId,
          status: updatedOrder.status.getValue(),
          items: updatedOrder.items.map((item) => ({
            bookId: item.bookId,
            bookTitle: book.title, // In real app, fetch all book details
            quantity: item.quantity,
            unitPrice: {
              amount: item.unitPrice.getAmount(),
              currency: item.unitPrice.getCurrency(),
            },
            subtotal: {
              amount: item.subtotal.getAmount(),
              currency: item.subtotal.getCurrency(),
            },
          })),
          total: {
            amount: updatedOrder.total.getAmount(),
            currency: updatedOrder.total.getCurrency(),
          },
          itemCount: updatedOrder.getTotalItemCount(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add item to order',
      };
    }
  }
}
