/**
 * Send Order Confirmation Handler - Lesson 5
 *
 * Reacts to OrderPlacedEvent by sending confirmation email/notification.
 * Demonstrates:
 * - Multiple handlers for same event
 * - Separation of concerns
 * - Side effects outside the domain
 */

import { IEventHandler } from '../../domain/events/IEventHandler';
import { OrderPlacedEvent } from '../../domain/events/OrderPlacedEvent';

export class SendOrderConfirmationHandler implements IEventHandler<OrderPlacedEvent> {
  getEventType(): string {
    return 'OrderPlaced';
  }

  async handle(event: OrderPlacedEvent): Promise<void> {
    console.log(`\n📧 [NotificationService] Handling OrderPlacedEvent`);
    console.log(`   Order ID: ${event.aggregateId}`);
    console.log(`   Customer ID: ${event.customerId}`);

    // In real implementation:
    // 1. Load customer email from User aggregate
    // 2. Generate email template with order details
    // 3. Send via email service (SendGrid, AWS SES, etc.)
    // 4. Log notification sent

    await this.sendConfirmationEmail(
      event.customerId,
      event.aggregateId,
      event.items,
      event.totalAmount
    );

    console.log(`✅ [NotificationService] Confirmation email sent to customer ${event.customerId}`);
  }

  /**
   * Simulate sending confirmation email
   */
  private async sendConfirmationEmail(
    customerId: string,
    orderId: string,
    items: readonly any[],
    totalAmount: { amount: number; currency: string }
  ): Promise<void> {
    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    console.log(`      To: customer-${customerId}@example.com`);
    console.log(`      Subject: Order Confirmation - Order #${orderId.substring(0, 8)}`);
    console.log(`      Items: ${items.length} items`);
    console.log(`      Total: ${totalAmount.currency} ${totalAmount.amount.toLocaleString()}`);
  }
}
