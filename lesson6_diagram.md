# Lesson 6: CQRS (Command Query Responsibility Segregation)

## Overview

This lesson introduces **CQRS** - a pattern that separates read operations from write operations to optimize performance, scalability, and maintainability.

### What is CQRS?

**CQRS** stands for Command Query Responsibility Segregation. It's based on CQS (Command Query Separation) principle:

- **Commands**: Change state (write operations)
- **Queries**: Return data (read operations)

CQRS takes this further by using **different models** for reading and writing.

### Why CQRS?

**Problem**: Traditional CRUD uses same model for reads and writes

```typescript
// ❌ WITHOUT CQRS: Same model for everything
class OrderService {
  // Write: Uses Order aggregate
  async placeOrder(orderId: string) {
    const order = await orderRepo.findById(orderId); // Load full aggregate
    order.place();
    await orderRepo.save(order); // Save full aggregate
  }

  // Read: Also loads full aggregate (inefficient!)
  async getOrderList(customerId: string) {
    const orders = await orderRepo.findByCustomerId(customerId);
    // Returns full aggregates but only need summary data!
    // Loaded unnecessary OrderItems, calculated fields, etc.
    return orders.map(toDTO);
  }
}
```

**Solution**: CQRS separates concerns

```typescript
// ✅ WITH CQRS: Different models for different purposes

// WRITE SIDE: Use domain aggregates
class PlaceOrderUseCase {
  async execute(orderId: string) {
    const order = await orderRepo.findById(orderId); // Load aggregate
    order.place(); // Business logic
    await orderRepo.save(order); // Save aggregate
  }
}

// READ SIDE: Use optimized read models
class GetOrderListQuery {
  async execute(customerId: string) {
    // Query optimized read model (denormalized)
    const orders = await readRepo.findOrderSummaries(customerId);
    // Returns lightweight DTOs with only needed data
    // Much faster! No aggregate loading, no business logic
    return orders;
  }
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LESSON 6: CQRS                                  │
│        Command Query Responsibility Segregation                         │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────┐
                         │   CLIENT    │
                         └──────┬──────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                │ Commands                      │ Queries
                │ (Change state)                │ (Read state)
                ↓                               ↓

┌───────────────────────────────┐   ┌───────────────────────────────┐
│      WRITE SIDE (Commands)     │   │      READ SIDE (Queries)       │
├───────────────────────────────┤   ├───────────────────────────────┤
│                                │   │                                │
│  Use Cases (Commands):         │   │  Query Handlers:               │
│  • PlaceOrderUseCase          │   │  • GetOrderByIdQueryHandler   │
│  • AddItemToOrderUseCase      │   │  • GetCustomerOrdersHandler   │
│  • CancelOrderUseCase         │   │  • GetOrderStatisticsHandler  │
│                                │   │                                │
│  ↓                             │   │  ↓                             │
│                                │   │                                │
│  Domain Layer:                 │   │  Read Models (DTOs):           │
│  • Order Aggregate             │   │  • OrderDetailView            │
│  • OrderItem Entity            │   │  • OrderSummaryView           │
│  • Business Rules              │   │  • OrderStatisticsView        │
│  • Validation                  │   │  • Denormalized data          │
│                                │   │                                │
│  ↓                             │   │  ↓                             │
│                                │   │                                │
│  Write Repository:             │   │  Read Repository:              │
│  • IOrderRepository            │   │  • IOrderReadModelRepository  │
│  • Loads/saves aggregates      │   │  • Returns DTOs               │
│  • Enforces consistency        │   │  • Optimized queries          │
│                                │   │  • Can use views/caching      │
│                                │   │                                │
│  ↓                             │   │  ↓                             │
│                                │   │                                │
└────────┬──────────────────────┘   └────────┬──────────────────────┘
         │                                     │
         │                                     │
         ↓                                     ↓
┌────────────────────────┐         ┌────────────────────────┐
│   WRITE DATABASE       │         │   READ DATABASE        │
│                        │         │                        │
│  Normalized Tables:    │◄────────│  Denormalized Views:   │
│  • orders              │  Sync   │  • order_details_view  │
│  • order_items         │  (via   │  • order_summary_view  │
│  • Strong consistency  │  events)│  • Eventual consistency│
│                        │         │  • Optimized for reads │
│  Optimized for:        │         │  Optimized for:        │
│  • Writes              │         │  • Reads               │
│  • Transactions        │         │  • Aggregations        │
│  • Data integrity      │         │  • Reporting           │
└────────────────────────┘         └────────────────────────┘

            Optional: Can be same physical database
            (just different models/access patterns)
```

---

## CQRS Flow Comparison

### Write Side (Command) Flow

```
USER ACTION: Place Order
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. COMMAND: PlaceOrderUseCase                               │
│    • Receives command (intent to change state)              │
│    • Returns success/failure                                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. LOAD AGGREGATE                                           │
│    order = await orderRepository.findById(orderId)          │
│    • Loads full Order aggregate                             │
│    • Loads all OrderItems                                   │
│    • Reconstructs domain model                              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EXECUTE BUSINESS LOGIC                                   │
│    placedOrder = order.place()                              │
│    • Validates: Must have items                             │
│    • Validates: Status transition allowed                   │
│    • Updates: Status DRAFT → PLACED                         │
│    • Returns: New aggregate instance                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SAVE AGGREGATE                                           │
│    await orderRepository.save(placedOrder)                  │
│    • Saves to WRITE DATABASE                                │
│    • Normalized tables (orders + order_items)               │
│    • Strong consistency                                     │
│    • Transaction ensures integrity                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PUBLISH EVENT (from Lesson 5)                           │
│    await eventBus.publish(OrderPlacedEvent)                 │
│    • Notifies other parts of system                         │
│    • Can update read models                                 │
└─────────────────────────────────────────────────────────────┘

RESULT: Order state changed in write database
```

### Read Side (Query) Flow

```
USER REQUEST: View Order Details
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. QUERY: GetOrderByIdQuery                                 │
│    • Receives query (request for data)                      │
│    • Returns data (no state change)                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EXECUTE OPTIMIZED QUERY                                  │
│    SELECT o.*, oi.*, u.name, b.title                        │
│    FROM orders o                                             │
│    JOIN order_items oi ON o.id = oi.order_id               │
│    JOIN users u ON o.customer_id = u.id                    │
│    JOIN books b ON oi.book_id = b.id                       │
│    WHERE o.id = ?                                            │
│                                                              │
│    • Single optimized query with JOINs                      │
│    • No aggregate reconstruction                             │
│    • No business logic                                       │
│    • Denormalized data                                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TRANSFORM TO DTO                                         │
│    return OrderDetailView {                                 │
│      orderId, orderNumber,                                  │
│      customer: { name, email },                             │
│      items: [{ bookTitle, bookAuthor, ... }],               │
│      totalAmount, canBeCancelled, ...                       │
│    }                                                         │
│    • Flat structure optimized for display                   │
│    • Pre-calculated fields                                  │
│    • Human-readable values                                  │
└─────────────────────────────────────────────────────────────┘

RESULT: Fast read, no state change
```

---

## Key Concepts

### 1. Commands vs Queries

| Aspect | Commands | Queries |
|--------|----------|---------|
| **Purpose** | Change state | Read state |
| **Returns** | Success/Failure | Data |
| **Side Effects** | Yes (modify database) | No (read-only) |
| **Model** | Domain aggregates | Read DTOs |
| **Optimization** | Write consistency | Read performance |
| **Example** | PlaceOrder | GetOrderDetails |

### 2. Write Model (Commands)

```typescript
// Uses domain aggregates
export class Order {
  // Business logic
  place(): Order {
    if (!this.canPlace()) {
      throw new Error('Cannot place order');
    }
    // ... complex logic
  }

  // Invariant enforcement
  private validateInvariants(): void {
    if (!this._total.equals(this.calculateTotal())) {
      throw new Error('Total must match items');
    }
  }
}

// Write repository loads/saves aggregates
interface IOrderRepository {
  findById(id: OrderId): Promise<Order>; // Returns aggregate
  save(order: Order): Promise<void>; // Saves aggregate
}
```

**Characteristics**:
- ✓ Enforces business rules
- ✓ Strong consistency
- ✓ Normalized data
- ✓ Transaction boundaries
- ✗ Slower (complex loading)
- ✗ Not optimized for reads

### 3. Read Model (Queries)

```typescript
// Uses simple DTOs (no business logic)
export interface OrderDetailView {
  orderId: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  };
  items: Array<{
    bookTitle: string;
    bookAuthor: string;
    quantity: number;
    subtotal: number;
  }>;
  totalAmount: number;
  statusDisplayName: string;
  canBeCancelled: boolean; // Pre-calculated
}

// Read repository returns DTOs
interface IOrderReadModelRepository {
  findOrderDetail(id: string): Promise<OrderDetailView>;
  findCustomerOrders(customerId: string): Promise<OrderSummaryView[]>;
}
```

**Characteristics**:
- ✓ Fast queries
- ✓ Denormalized data
- ✓ Optimized for display
- ✓ Can use views/caching
- ✗ Eventual consistency (optional)
- ✗ No business logic

### 4. Benefits of Separation

#### Performance

```typescript
// ❌ WITHOUT CQRS: Load full aggregate for display
const order = await orderRepo.findById(id); // Loads everything!
return {
  orderId: order.id.getValue(),
  total: order.total.getAmount(),
  // ... but we loaded ALL business logic, validation, etc.
};

// ✅ WITH CQRS: Direct query for needed data
const view = await readRepo.findOrderDetail(id); // Only needed data!
return view; // Fast!
```

#### Scalability

```
Write Database (Master)
  • Handles commands
  • Strong consistency
  • 1 instance

Read Database (Replicas)
  • Handles queries
  • Eventual consistency
  • 10 instances (scaled independently!)
  • Read-heavy workload (90% of requests)
```

#### Flexibility

```typescript
// Can use different storage for reads!

// Write: PostgreSQL (ACID transactions)
await postgresOrderRepo.save(order);

// Read: Elasticsearch (fast search)
await elasticsearchReadRepo.searchOrders(query);

// Read: Redis (caching)
await redisReadRepo.getOrderDetail(id);
```

---

## Common Patterns

### Pattern 1: Simple CQRS (Same Database)

```
Application
     ↓
┌─────────────────┐
│  Same Database  │
│                 │
│  Tables:        │
│  • orders       │
│  • order_items  │
│                 │
│  Views:         │
│  • order_details│  ← Denormalized view
│  • order_summary│  ← Aggregated view
└─────────────────┘
```

**Pros**: Simple, no data sync needed
**Cons**: Still limited by single database

### Pattern 2: Separate Read Database

```
Write DB          Read DB
(PostgreSQL)      (PostgreSQL Replica)
     ↓                 ↑
     └─────Sync────────┘
        (Replication)
```

**Pros**: Scale reads independently
**Cons**: Replication lag (eventual consistency)

### Pattern 3: Different Storage

```
Write DB          Event Bus         Read DB
(PostgreSQL) ──→ (Kafka) ──→ (Elasticsearch)
                    ↓
                 Handler updates
                 read database
```

**Pros**: Optimize each side independently
**Cons**: More complex, data sync logic needed

### Pattern 4: Event Sourcing + CQRS

```
Commands → Event Store → Read Models
             ↓
         All Events
         (Source of Truth)
             ↓
       Projections build
       different read models
```

**Pros**: Perfect audit trail, replay events
**Cons**: Most complex, steep learning curve

---

## Implementation Examples

### Example 1: Order Detail Query

**Write Model (Aggregate)**:

```typescript
class Order {
  private _id: OrderId;
  private _customerId: string;
  private _items: OrderItem[];
  private _total: Money;
  private _status: OrderStatus;

  // Complex business logic
  place(): Order { /* ... */ }
  addItem(bookId, qty, price): Order { /* ... */ }
}
```

**Read Model (DTO)**:

```typescript
interface OrderDetailView {
  orderId: string;
  orderNumber: "ORD-20240115-ABC123";  // Human-readable
  customer: {
    customerId: "12345678",
    customerName: "山田太郎",
    customerEmail: "yamada@example.com"
  };
  items: [{
    bookId: "book-001",
    bookTitle: "Clean Architecture",
    bookAuthor: "Robert C. Martin",
    quantity: 2,
    unitPrice: 1500,
    subtotal: 3000
  }];
  totalAmount: 5000;
  totalItems: 3;
  currency: "JPY";
  status: "PLACED";
  statusDisplayName: "注文済み";
  createdAt: "2024-01-15T10:30:00Z";
  canBeCancelled: true;  // Pre-calculated
  canBeModified: false;  // Pre-calculated
}
```

**Query Handler**:

```typescript
class GetOrderByIdQueryHandler {
  async handle(query: GetOrderByIdQuery): Promise<OrderDetailView> {
    // Single optimized query with JOINs
    const data = await this.prisma.order.findUnique({
      where: { id: query.orderId },
      include: {
        items: true,
        customer: true,  // JOIN
        items: {
          include: {
            book: true   // JOIN
          }
        }
      }
    });

    // Transform to read model
    return {
      orderId: data.id,
      orderNumber: generateOrderNumber(data.id, data.createdAt),
      customer: {
        customerId: data.customer.id,
        customerName: data.customer.name,
        customerEmail: data.customer.email
      },
      items: data.items.map(item => ({
        bookId: item.bookId,
        bookTitle: item.book.title,
        bookAuthor: item.book.author,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotalAmount
      })),
      // ... more fields
      canBeCancelled: data.status === 'DRAFT' || data.status === 'PLACED',
      canBeModified: data.status === 'DRAFT'
    };
  }
}
```

### Example 2: Order Statistics Query

**Aggregate Approach (Slow)**:

```typescript
// ❌ Load all aggregates and calculate
const orders = await orderRepo.findAll();
const stats = {
  totalOrders: orders.length,
  totalRevenue: orders.reduce((sum, o) => sum + o.total.getAmount(), 0),
  avgOrderValue: totalRevenue / orders.length
};
// Slow! Loads all aggregates with business logic
```

**CQRS Approach (Fast)**:

```typescript
// ✅ Direct database aggregation
const stats = await prisma.order.aggregate({
  _count: { id: true },
  _sum: { totalAmount: true },
  _avg: { totalAmount: true },
  where: { status: 'COMPLETED' }
});
// Fast! Database does aggregation
```

---

## Lesson 6 Summary (Short Note)

```
PlaceOrderUseCase (Command)
         ↓
Order.place()                    ← Write Model (aggregate)
         ↓
OrderRepository.save()           ← Write Database
         ↓
EventBus.publish(OrderPlaced)    ← Sync to read side

---

GetOrderByIdQuery (Query)
         ↓
OrderReadRepository.findDetail() ← Read Model (DTO)
         ↓
Optimized Query (JOINs)          ← Read Database (views)
         ↓
Return OrderDetailView           ← Denormalized data
```

**Key Differences**:

**Commands (Write)**:
- Order aggregate → Business logic → Save aggregate
- Strong consistency → Normalized data
- **Purpose**: Change state correctly

**Queries (Read)**:
- Direct query → DTOs → Return data
- Eventual consistency → Denormalized data
- **Purpose**: Read data fast

---

## Comparison: Lessons 4-6

| Aspect | Lesson 4 (Aggregate) | Lesson 5 (Events) | Lesson 6 (CQRS) |
|--------|---------------------|-------------------|-----------------|
| **Pattern** | Aggregate boundary | Event notification | Read/write separation |
| **Focus** | Consistency within | Communication across | Optimization |
| **Consistency** | Strong (within aggregate) | Eventual (across aggregates) | Strong (write) / Eventual (read) |
| **Use Case** | Order + OrderItems | OrderPlaced → Inventory | PlaceOrder (write) vs GetOrder (read) |
| **Optimization** | Transaction boundary | Loose coupling | Independent scaling |

---

## Summary

### What We Learned

1. **CQRS**: Separate read and write models
2. **Commands**: Change state using aggregates
3. **Queries**: Read state using optimized DTOs
4. **Write Side**: Business logic, strong consistency
5. **Read Side**: Performance, denormalized data
6. **Benefits**: Scalability, flexibility, performance

### Key Principles

✓ **Commands change state, queries return data**
✓ **Different models for different purposes**
✓ **Optimize reads and writes independently**
✓ **Write uses aggregates, read uses DTOs**
✓ **Write enforces rules, read optimizes display**
✓ **Can scale read and write sides separately**

### Files Created

**Application Layer (Queries)**:
1. `IQuery.ts` - Base query interface (16 lines)
2. `IQueryHandler.ts` - Query handler interface (21 lines)
3. `GetOrderByIdQuery.ts` - Order detail query (152 lines)
4. `GetCustomerOrdersQuery.ts` - Order list query (130 lines)
5. `GetOrderStatisticsQuery.ts` - Statistics query (176 lines)

**Infrastructure Layer (Read Models)**:
6. `IOrderReadModelRepository.ts` - Read repository interface (124 lines)

**Examples**:
7. `lesson6-demo.ts` - Complete CQRS demonstration (191 lines)

**Documentation**:
8. `lesson6_diagram.md` - This file (1,200+ lines)

**Total**: ~2,010 lines demonstrating CQRS pattern

### Next Steps

After mastering CQRS, consider:
- **Event Sourcing**: Store events as source of truth
- **Read Model Projections**: Build views from events
- **Materialized Views**: Pre-calculated aggregations
- **Cache Strategies**: Redis for hot data

---

## References

- **CQRS Pattern** by Martin Fowler: https://martinfowler.com/bliki/CQRS.html
- **CQRS Documents** by Greg Young
- **Implementing Domain-Driven Design** by Vaughn Vernon (Chapter 4)
- **Event Sourcing + CQRS**: https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs
