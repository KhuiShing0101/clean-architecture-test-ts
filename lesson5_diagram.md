# Lesson 5: Domain Events and Event-Driven Architecture

## Overview

This lesson introduces **Domain Events** - a powerful pattern for decoupling different parts of your system and enabling eventual consistency across aggregates.

### What is a Domain Event?

A **Domain Event** is something that happened in the domain that domain experts care about.

**Key Characteristics**:
- Named in **past tense** (OrderPlaced, BookBorrowed, PaymentProcessed)
- **Immutable** - what happened cannot be changed
- Contains **all data** needed by handlers
- Has a **timestamp** of when it occurred

### Why Domain Events?

**Problem**: How do different parts of the system react to changes without tight coupling?

```typescript
// ❌ WITHOUT Events: Tight coupling
class PlaceOrderUseCase {
  async execute(orderId: string) {
    const order = await orderRepo.findById(orderId);
    order.place();
    await orderRepo.save(order);

    // Tightly coupled to other services!
    await inventoryService.reserve(order.items);
    await emailService.sendConfirmation(order.customerId);
    await paymentService.process(order.total);
    await analyticsService.track(order);

    // What if a new requirement comes? Modify this use case again!
  }
}
```

**Solution**: Domain Events decouple publishers from consumers

```typescript
// ✅ WITH Events: Loose coupling
class PlaceOrderUseCase {
  async execute(orderId: string) {
    const order = await orderRepo.findById(orderId);
    order.place();
    await orderRepo.save(order);

    // Just publish the event!
    await eventBus.publish(new OrderPlacedEvent(order));

    // Handlers react independently:
    // - ReserveInventoryHandler
    // - SendConfirmationHandler
    // - ProcessPaymentHandler
    // - TrackAnalyticsHandler
    //
    // New handlers can be added WITHOUT modifying this use case!
  }
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LESSON 5: DOMAIN EVENTS                         │
│                      Event-Driven Architecture                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                               │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  PlaceOrderUseCase                                             │    │
│  │                                                                 │    │
│  │  execute(orderId):                                             │    │
│  │    1. order = orderRepo.findById(orderId)                     │    │
│  │    2. placedOrder = order.place()                             │    │
│  │    3. orderRepo.save(placedOrder)                             │    │
│  │    4. eventBus.publish(OrderPlacedEvent) ← NEW!               │    │
│  │         ↓                                                      │    │
│  └─────────┼────────────────────────────────────────────────────────┘    │
│            │                                                             │
└────────────┼──────────────────────────────────────────────────────────┘
             │
             │  publish(OrderPlacedEvent)
             ↓
┌────────────────────────────────────────────────────────────────────────┐
│                            EVENT BUS                                    │
│                     (Publish-Subscribe Pattern)                         │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  InMemoryEventBus                                             │     │
│  │                                                                │     │
│  │  Publishers         EVENT BUS           Subscribers           │     │
│  │     │                  │                     │                │     │
│  │     │──────publish────→│                     │                │     │
│  │                        │───────notify────────→│                │     │
│  │                        │                     │                │     │
│  │  Handlers Map:                                                │     │
│  │  {                                                             │     │
│  │    "OrderPlaced": [                                           │     │
│  │      ReserveInventoryHandler,                                 │     │
│  │      SendOrderConfirmationHandler                             │     │
│  │    ],                                                          │     │
│  │    "OrderCancelled": [                                        │     │
│  │      ReleaseInventoryHandler                                  │     │
│  │    ]                                                           │     │
│  │  }                                                             │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                 │                                       │
│                                 │ notify all handlers                   │
│                                 ↓                                       │
│         ┌───────────────────────┴───────────────────────┐             │
│         │                       │                         │             │
└─────────┼───────────────────────┼─────────────────────────┼────────────┘
          │                       │                         │
          ↓                       ↓                         ↓
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ HANDLER 1:       │   │ HANDLER 2:       │   │ HANDLER 3:       │
│ Reserve          │   │ Send Email       │   │ Track Analytics  │
│ Inventory        │   │ Confirmation     │   │                  │
└──────┬───────────┘   └──────┬───────────┘   └──────┬───────────┘
       │                      │                       │
       ↓                      ↓                       ↓
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Inventory        │   │ Notification     │   │ Analytics        │
│ Aggregate        │   │ Service          │   │ Service          │
└──────────────────┘   └──────────────────┘   └──────────────────┘

Key Points:
✓ Publisher doesn't know who's listening
✓ Handlers don't know who published
✓ New handlers can be added without changing publisher
✓ Handlers execute independently (eventual consistency)
```

---

## Domain Events Flow

### Flow 1: Order Placed Event

```
USER ACTION: Place Order
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. APPLICATION LAYER                                            │
│    PlaceOrderUseCase.execute()                                  │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. DOMAIN LAYER                                                 │
│    order.place() → Status: DRAFT → PLACED                       │
│    Aggregate validates and updates state                        │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. INFRASTRUCTURE LAYER                                         │
│    orderRepository.save(order)                                  │
│    Transaction: Save order + items to database                  │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EVENT PUBLISHING                                             │
│    Create OrderPlacedEvent:                                     │
│      - eventId: uuid                                            │
│      - aggregateId: order.id                                    │
│      - customerId: order.customerId                             │
│      - items: order.items                                       │
│      - totalAmount: order.total                                 │
│      - occurredOn: new Date()                                   │
│                                                                  │
│    eventBus.publish(OrderPlacedEvent)                           │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. EVENT BUS                                                    │
│    Lookup handlers for "OrderPlaced" event type                 │
│    Found 2 handlers:                                            │
│      - ReserveInventoryHandler                                  │
│      - SendOrderConfirmationHandler                             │
│                                                                  │
│    Execute each handler.handle(event)                           │
└────────────┬────────────────────────┬────────────────────────────┘
             │                        │
             ↓                        ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│ 6a. HANDLER 1 EXECUTION  │  │ 6b. HANDLER 2 EXECUTION  │
│ ReserveInventoryHandler  │  │ SendOrderConfirmationHandler│
│                          │  │                          │
│ handle(OrderPlacedEvent) │  │ handle(OrderPlacedEvent) │
│   For each item:         │  │   Get customer email     │
│     Load Inventory       │  │   Generate email body    │
│     Reserve stock        │  │   Send via EmailService  │
│     Save Inventory       │  │   Log notification sent  │
│   Publish:               │  │                          │
│     InventoryReserved    │  │ Result: Email sent ✅    │
│                          │  │                          │
│ Result: Stock reserved ✅│  │                          │
└──────────────────────────┘  └──────────────────────────┘

FINAL RESULT:
✓ Order saved to database
✓ Inventory reserved for all items
✓ Confirmation email sent to customer
✓ All without tight coupling!
```

---

## Key Concepts

### 1. Event Naming Convention

Events are always named in **past tense** because they represent something that already happened:

```typescript
// ✅ CORRECT: Past tense
OrderPlacedEvent
BookBorrowedEvent
PaymentProcessedEvent
UserRegisteredEvent
InventoryReservedEvent

// ❌ WRONG: Present/Future tense
PlaceOrderEvent      // Sounds like a command
BorrowBookEvent      // Sounds like a command
ProcessPaymentEvent  // Sounds like a command
```

### 2. Event Immutability

Events cannot be changed once created:

```typescript
export class OrderPlacedEvent {
  // All properties are readonly
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly customerId: string;
  readonly items: readonly OrderItem[];  // Immutable array
  readonly totalAmount: { readonly amount: number; readonly currency: string };

  constructor(/* ... */) {
    // Create immutable copies
    this.items = [...items];
    this.totalAmount = { ...totalAmount };
    this.occurredOn = new Date(); // Captured at creation
  }
}

// ❌ Cannot modify
event.customerId = 'new-id';  // TypeScript error
event.items.push(newItem);     // TypeScript error
```

### 3. Publish-Subscribe Pattern

**Event Bus** implements pub/sub:

```typescript
// Publishers don't know about subscribers
await eventBus.publish(new OrderPlacedEvent(order));

// Subscribers don't know about publishers
class ReserveInventoryHandler implements IEventHandler {
  getEventType() { return 'OrderPlaced'; }

  async handle(event: OrderPlacedEvent) {
    // React to event
  }
}

// Registration (typically at app startup)
eventBus.subscribe(new ReserveInventoryHandler());
eventBus.subscribe(new SendOrderConfirmationHandler());
```

### 4. Eventual Consistency

Events are processed **eventually**, not immediately:

```typescript
// Order is saved FIRST
await orderRepository.save(placedOrder);

// Event is published AFTER
await eventBus.publish(event);

// Handlers run asynchronously
// → Inventory might not be reserved immediately
// → Email might not be sent immediately
// → But eventually, everything will be consistent
```

**vs Strong Consistency** (Lesson 4 - Aggregates):

```typescript
// Aggregate enforces strong consistency
const order = order.addItem(bookId, quantity, price);
// Total is ALWAYS correct (calculated immediately)
console.log(order.total); // Guaranteed correct
```

---

## Event vs Command

### Command (Request to do something)

```typescript
// Command: Imperative, can be rejected
interface PlaceOrderCommand {
  orderId: string;
}

// Sent to: PlaceOrderUseCase
// Result: Success or failure
const result = await placeOrderUseCase.execute(command);
if (!result.success) {
  // Command was rejected
}
```

### Event (Something that happened)

```typescript
// Event: Past tense, cannot be rejected
class OrderPlacedEvent {
  readonly orderId: string;
  readonly occurredOn: Date;
}

// Published to: EventBus
// Result: Handlers react (cannot fail the event)
await eventBus.publish(event);
// Event always succeeds
// Individual handlers might fail, but event is published
```

| Aspect | Command | Event |
|--------|---------|-------|
| **Name** | Imperative (PlaceOrder) | Past tense (OrderPlaced) |
| **Direction** | Point-to-point (to one handler) | Broadcast (to many handlers) |
| **Result** | Can be rejected | Already happened, cannot be rejected |
| **Recipients** | 1 handler | 0..N handlers |
| **Purpose** | Request action | Notify of fact |

---

## Benefits of Domain Events

### 1. **Loose Coupling**

✓ Publisher doesn't know about handlers
✓ Handlers don't know about publisher
✓ New handlers don't require changes to publisher

**Example**: Add analytics without touching order logic

```typescript
// Original handlers
eventBus.subscribe(new ReserveInventoryHandler());
eventBus.subscribe(new SendOrderConfirmationHandler());

// NEW requirement: Track analytics
// → Just add new handler, no changes to PlaceOrderUseCase!
eventBus.subscribe(new TrackOrderAnalyticsHandler());
```

### 2. **Separation of Concerns**

Each handler has one responsibility:

```typescript
// Handler 1: Only handles inventory
class ReserveInventoryHandler {
  async handle(event) {
    // Focus: Inventory logic only
  }
}

// Handler 2: Only handles notifications
class SendOrderConfirmationHandler {
  async handle(event) {
    // Focus: Notification logic only
  }
}

// vs WITHOUT Events: Everything mixed together
class PlaceOrderUseCase {
  async execute() {
    // Order logic
    // Inventory logic
    // Email logic
    // Payment logic
    // Analytics logic
    // → Hard to maintain!
  }
}
```

### 3. **Scalability**

Handlers can be scaled independently:

```
Order Service → EventBus → Inventory Service (scaled to 5 instances)
                        → Email Service (scaled to 2 instances)
                        → Analytics Service (scaled to 10 instances)
```

### 4. **Testability**

Easy to test in isolation:

```typescript
// Test publisher without handlers
test('PlaceOrderUseCase publishes event', async () => {
  const mockEventBus = { publish: jest.fn() };
  const useCase = new PlaceOrderUseCase(repo, mockEventBus);

  await useCase.execute({ orderId: '123' });

  expect(mockEventBus.publish).toHaveBeenCalledWith(
    expect.any(OrderPlacedEvent)
  );
});

// Test handler without publisher
test('ReserveInventoryHandler reserves stock', async () => {
  const handler = new ReserveInventoryHandler(inventoryRepo);
  const event = new OrderPlacedEvent(/* ... */);

  await handler.handle(event);

  // Assert inventory was reserved
});
```

---

## Common Patterns

### Pattern 1: Compensating Transaction

Use events to undo actions:

```typescript
// Order placed → Inventory reserved
await eventBus.publish(new OrderPlacedEvent(order));

// Order cancelled → Inventory released (compensate)
await eventBus.publish(new OrderCancelledEvent(order));

// Handler undoes previous action
class ReleaseInventoryHandler {
  async handle(event: OrderCancelledEvent) {
    // Release previously reserved inventory
    const inventory = await inventoryRepo.findByOrderId(event.aggregateId);
    inventory.release();
    await inventoryRepo.save(inventory);
  }
}
```

### Pattern 2: Saga Pattern

Coordinate multi-step processes:

```
Order Placed Event
    ↓
Reserve Inventory → Inventory Reserved Event
    ↓
Process Payment → Payment Processed Event
    ↓
Ship Order → Order Shipped Event

If any step fails → Publish compensating events
```

### Pattern 3: Event Sourcing

Store events as source of truth:

```typescript
// Instead of storing current state
orders table: { id, status, total }

// Store all events
events table: [
  { type: 'OrderCreated', data: { ... } },
  { type: 'ItemAdded', data: { bookId: '1', quantity: 2 } },
  { type: 'ItemAdded', data: { bookId: '2', quantity: 1 } },
  { type: 'OrderPlaced', data: { ... } }
]

// Rebuild state by replaying events
const order = events.reduce((state, event) => {
  return applyEvent(state, event);
}, initialState);
```

---

## Implementation Details

### Event Bus - In-Memory Implementation

```typescript
export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, IEventHandler<any>[]> = new Map();

  async publish(event: IDomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];

    // Execute all handlers
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        // Log error but continue with other handlers
        console.error(`Error in handler for ${event.eventType}:`, error);
      }
    }
  }

  subscribe(handler: IEventHandler<any>): void {
    const eventType = handler.getEventType();

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
  }
}
```

**Characteristics**:
- ✓ Simple and fast
- ✓ Synchronous execution (for demo)
- ✗ No persistence
- ✗ No retry logic
- ✗ Lost if process crashes

### Production Event Bus

In production, use message queues:

**RabbitMQ**:
```typescript
await channel.publish('orders', 'order.placed', Buffer.from(JSON.stringify(event)));
```

**AWS EventBridge**:
```typescript
await eventBridge.putEvents({
  Entries: [{
    Source: 'order-service',
    DetailType: 'OrderPlaced',
    Detail: JSON.stringify(event)
  }]
});
```

**Apache Kafka**:
```typescript
await producer.send({
  topic: 'order-events',
  messages: [{ value: JSON.stringify(event) }]
});
```

---

## Comparison: Lessons 3-5

| Aspect | Lesson 3 (Domain Service) | Lesson 4 (Aggregate) | Lesson 5 (Events) |
|--------|---------------------------|----------------------|-------------------|
| **Pattern** | Service coordinates | Root controls | Events notify |
| **Coupling** | Medium (service knows both entities) | Low (within aggregate) | Very low (pub/sub) |
| **Consistency** | Eventual (2 saves) | Strong (1 transaction) | Eventual (async handlers) |
| **Use Case** | Multi-entity operations | Clustered entities | Cross-aggregate reactions |
| **Example** | BorrowBookService(User, Book) | Order controls OrderItems | OrderPlaced → Reserve Inventory |

### When to Use What?

**Use Domain Service** (Lesson 3) when:
- Logic spans independent entities
- Both entities are in same bounded context
- Synchronous coordination needed
- Example: Borrow book (coordinates User + Book)

**Use Aggregate** (Lesson 4) when:
- Entities must change together
- Strong consistency required
- Clear parent-child relationship
- Example: Order + OrderItems

**Use Domain Events** (Lesson 5) when:
- Need to notify other parts of system
- Across aggregate boundaries
- Across bounded contexts
- Eventual consistency acceptable
- Example: OrderPlaced → Inventory, Email, Analytics

---

## Summary

### What We Learned

1. **Domain Events**: Notifications of what happened
2. **Event Bus**: Pub/sub infrastructure
3. **Event Handlers**: React to events
4. **Loose Coupling**: Publishers don't know subscribers
5. **Eventual Consistency**: Actions happen eventually
6. **Compensating Transactions**: Undo via events

### Key Principles

✓ **Events are immutable facts**
✓ **Named in past tense**
✓ **Publish after save** (persist first, then notify)
✓ **Handlers are independent**
✓ **New handlers don't change publishers**
✓ **Eventual consistency across aggregates**

### Files Created

**Domain Layer**:
1. `IDomainEvent.ts` - Base event interface (26 lines)
2. `OrderPlacedEvent.ts` - Order placed event (66 lines)
3. `OrderCancelledEvent.ts` - Order cancelled event (54 lines)
4. `IEventHandler.ts` - Handler interface (18 lines)
5. `IEventBus.ts` - Event bus interface (38 lines)

**Application Layer**:
6. `ReserveInventoryHandler.ts` - Reserve stock handler (69 lines)
7. `SendOrderConfirmationHandler.ts` - Email handler (60 lines)
8. `ReleaseInventoryHandler.ts` - Release stock handler (57 lines)
9. `PlaceOrderUseCase.ts` - Updated to publish events (152 lines)

**Infrastructure Layer**:
10. `InMemoryEventBus.ts` - Event bus implementation (105 lines)

**Examples**:
11. `lesson5-demo.ts` - Complete demo (177 lines)

**Total**: ~822 lines demonstrating event-driven architecture

### Lesson 5 Flow (Short)

```
PlaceOrderUseCase
         ↓
Order.place()                   ← Domain Layer
         ↓
OrderRepository.save()          ← Infrastructure Layer
         ↓
EventBus.publish(OrderPlacedEvent)  ← Event Publishing
         ↓
┌────────┴────────┐
↓                 ↓
ReserveInventory  SendEmailConfirmation
Handler           Handler
↓                 ↓
Inventory Service Email Service
```

### Next Steps

After mastering domain events, you're ready for:
- **Lesson 6**: CQRS (Command Query Responsibility Segregation)
- Event Sourcing (advanced)
- Sagas and Process Managers (advanced)
- Distributed tracing for events

---

## References

- **Domain Events** by Martin Fowler
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **Enterprise Integration Patterns** by Gregor Hohpe
- **Event-Driven Architecture**: https://martinfowler.com/articles/201701-event-driven.html
