# Lesson 4: Aggregates and Consistency Boundaries

## Overview

This lesson introduces **Aggregates** - one of the most important patterns in Domain-Driven Design (DDD).

### What is an Aggregate?

An **Aggregate** is a cluster of domain objects (entities and value objects) that can be treated as a single unit for data changes. Each aggregate has:

- **Aggregate Root**: The single entry point - only entity accessible from outside
- **Child Entities**: Internal entities accessible only through the root
- **Consistency Boundary**: Rules that must always be true within the aggregate
- **Transaction Boundary**: One transaction per aggregate

### Why Aggregates?

**Problem**: Without aggregates, it's unclear which entities should be modified together, leading to:
- Data inconsistency (e.g., order total doesn't match item subtotals)
- Complex transaction management
- Tight coupling between entities

**Solution**: Aggregates define clear boundaries for:
- **Consistency**: What must change together
- **Transactions**: What should be saved together
- **Access Control**: What can be accessed directly vs through a root

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLEAN ARCHITECTURE LAYERS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    PRESENTATION LAYER                           │   │
│  │              (Controllers, API Routes - NOT SHOWN)              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                ↓                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                     APPLICATION LAYER                           │   │
│  │                                                                  │   │
│  │   ┌──────────────────────┐  ┌──────────────────────┐          │   │
│  │   │ CreateOrderUseCase   │  │ AddItemToOrderUseCase│          │   │
│  │   │                      │  │                      │          │   │
│  │   │ - Create draft order │  │ - Find order         │          │   │
│  │   │ - Save to repo       │  │ - Add item via root  │          │   │
│  │   │ - Return DTO         │  │ - Save aggregate     │          │   │
│  │   └──────────────────────┘  └──────────────────────┘          │   │
│  │              ↓                          ↓                       │   │
│  │   ┌──────────────────────┐  ┌──────────────────────┐          │   │
│  │   │ PlaceOrderUseCase    │  │ More use cases...    │          │   │
│  │   │                      │  │                      │          │   │
│  │   │ - Find order         │  │ - CompleteOrder      │          │   │
│  │   │ - Call order.place() │  │ - CancelOrder        │          │   │
│  │   │ - Save aggregate     │  │ - RemoveItem         │          │   │
│  │   └──────────────────────┘  └──────────────────────┘          │   │
│  │                                                                  │   │
│  └─────────────────────────────────┬────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                       DOMAIN LAYER                              │   │
│  │                                                                  │   │
│  │   ┌──────────────────────────────────────────────────────┐    │   │
│  │   │           ORDER AGGREGATE (Consistency Boundary)      │    │   │
│  │   │                                                        │    │   │
│  │   │   ┌────────────────────────────────────────────┐    │    │   │
│  │   │   │  Order (AGGREGATE ROOT) ⭐                 │    │    │   │
│  │   │   │                                             │    │    │   │
│  │   │   │  Fields:                                    │    │    │   │
│  │   │   │  - id: OrderId (value object)              │    │    │   │
│  │   │   │  - customerId: string                      │    │    │   │
│  │   │   │  - items: OrderItem[] (protected!)         │    │    │   │
│  │   │   │  - total: Money (value object)             │    │    │   │
│  │   │   │  - status: OrderStatus (value object)      │    │    │   │
│  │   │   │  - timestamps: Date                        │    │    │   │
│  │   │   │                                             │    │    │   │
│  │   │   │  Behaviors (Enforce Invariants):           │    │    │   │
│  │   │   │  + addItem(bookId, qty, price): Order      │    │    │   │
│  │   │   │  + removeItem(bookId): Order               │    │    │   │
│  │   │   │  + updateItemQuantity(bookId, qty): Order  │    │    │   │
│  │   │   │  + place(): Order (DRAFT → PLACED)         │    │    │   │
│  │   │   │  + complete(): Order (PLACED → COMPLETED)  │    │    │   │
│  │   │   │  + cancel(): Order (→ CANCELLED)           │    │    │   │
│  │   │   │  + canPlace(): boolean                     │    │    │   │
│  │   │   │  + canModify(): boolean                    │    │    │   │
│  │   │   │                                             │    │    │   │
│  │   │   │  Invariants (ALWAYS maintained):           │    │    │   │
│  │   │   │  ✓ Total = sum of item subtotals           │    │    │   │
│  │   │   │  ✓ Items can only be modified in DRAFT     │    │    │   │
│  │   │   │  ✓ Must have items to place order          │    │    │   │
│  │   │   │  ✓ Status transitions follow state machine │    │    │   │
│  │   │   └────────────────────────────────────────────┘    │    │   │
│  │   │                       │                              │    │   │
│  │   │                       │ HAS (protected)              │    │   │
│  │   │                       │                              │    │   │
│  │   │   ┌────────────────────────────────────────────┐    │    │   │
│  │   │   │  OrderItem (CHILD ENTITY) 🔒              │    │    │   │
│  │   │   │                                             │    │    │   │
│  │   │   │  Fields:                                    │    │    │   │
│  │   │   │  - bookId: string                          │    │    │   │
│  │   │   │  - quantity: number                        │    │    │   │
│  │   │   │  - unitPrice: Money (value object)         │    │    │   │
│  │   │   │  - subtotal: Money (value object)          │    │    │   │
│  │   │   │                                             │    │    │   │
│  │   │   │  ⚠️  NO PUBLIC SETTERS                      │    │    │   │
│  │   │   │  ⚠️  Cannot be accessed directly            │    │    │   │
│  │   │   │  ⚠️  Must go through Order aggregate root   │    │    │   │
│  │   │   │                                             │    │    │   │
│  │   │   │  Invariants:                                │    │    │   │
│  │   │   │  ✓ Subtotal = unitPrice × quantity         │    │    │   │
│  │   │   │  ✓ Quantity > 0                            │    │    │   │
│  │   │   └────────────────────────────────────────────┘    │    │   │
│  │   │                                                        │    │   │
│  │   └────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │   Value Objects (Supporting the Aggregate):                     │   │
│  │   ┌───────────────┐  ┌──────────────┐  ┌─────────────┐        │   │
│  │   │ OrderId       │  │ OrderStatus  │  │ Money       │        │   │
│  │   │ - UUID v4     │  │ - DRAFT      │  │ - amount    │        │   │
│  │   │               │  │ - PLACED     │  │ - currency  │        │   │
│  │   │               │  │ - COMPLETED  │  │ + add()     │        │   │
│  │   │               │  │ - CANCELLED  │  │ + multiply()│        │   │
│  │   └───────────────┘  └──────────────┘  └─────────────┘        │   │
│  │                                                                  │   │
│  │   Repository Interface (Domain defines, Infrastructure implements): │
│  │   ┌──────────────────────────────────────────────────────┐    │   │
│  │   │ IOrderRepository                                      │    │   │
│  │   │ + save(order: Order): Promise<void>                  │    │   │
│  │   │ + findById(id: OrderId): Promise<Order | null>       │    │   │
│  │   │ + findByCustomerId(id: string): Promise<Order[]>     │    │   │
│  │   │ + delete(id: OrderId): Promise<void>                 │    │   │
│  │   │                                                        │    │   │
│  │   │ ⚠️  Saves ENTIRE aggregate as unit                     │    │   │
│  │   │ ⚠️  ONE transaction per aggregate                      │    │   │
│  │   └──────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     ↓                                    │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                   INFRASTRUCTURE LAYER                          │   │
│  │                                                                  │   │
│  │   ┌──────────────────────────────────────────────────────┐    │   │
│  │   │ PrismaOrderRepository (implements IOrderRepository)   │    │   │
│  │   │                                                        │    │   │
│  │   │ save(order):                                          │    │   │
│  │   │   Transaction {                                       │    │   │
│  │   │     1. Delete existing OrderItems                     │    │   │
│  │   │     2. Upsert Order                                   │    │   │
│  │   │     3. Insert all OrderItems                          │    │   │
│  │   │   }                                                    │    │   │
│  │   │   → All or nothing (atomic)                           │    │   │
│  │   │                                                        │    │   │
│  │   │ findById(id):                                         │    │   │
│  │   │   1. Query Order with items (JOIN)                    │    │   │
│  │   │   2. Reconstruct OrderItems                           │    │   │
│  │   │   3. Reconstruct Order aggregate                      │    │   │
│  │   │   → Returns complete aggregate                        │    │   │
│  │   │                                                        │    │   │
│  │   └──────────────────────────────────────────────────────┘    │   │
│  │                              ↓                                  │   │
│  │   ┌──────────────────────────────────────────────────────┐    │   │
│  │   │              PRISMA ORM + POSTGRESQL                  │    │   │
│  │   │                                                        │    │   │
│  │   │   orders table              order_items table         │    │   │
│  │   │   ├── id (PK)                ├── id (PK)              │    │   │
│  │   │   ├── customer_id            ├── order_id (FK) ───────┼──┐ │   │
│  │   │   ├── total_amount           ├── book_id              │  │ │   │
│  │   │   ├── currency               ├── quantity             │  │ │   │
│  │   │   ├── status                 ├── unit_price           │  │ │   │
│  │   │   ├── created_at             ├── currency             │  │ │   │
│  │   │   ├── placed_at              └── subtotal_amount      │  │ │   │
│  │   │   ├── completed_at                                    │  │ │   │
│  │   │   └── cancelled_at      ON DELETE CASCADE ←───────────┘  │ │   │
│  │   │                                                        │    │   │
│  │   └──────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Aggregate Root

The **Order** is the aggregate root:

```typescript
// ✅ CORRECT: Access through aggregate root
const order = Order.create(customerId);
const updatedOrder = order.addItem(bookId, quantity, unitPrice);
await orderRepository.save(updatedOrder);

// ❌ WRONG: Cannot access OrderItem directly
const item = OrderItem.create(bookId, quantity, unitPrice);
await orderItemRepository.save(item); // No such repository!
```

### 2. Consistency Boundary

All invariants within the aggregate are ALWAYS maintained:

```typescript
export class Order {
  private validateInvariants(): void {
    // This is checked on EVERY operation
    const calculatedTotal = this.calculateTotalFromItems(this._items);
    if (!this._total.equals(calculatedTotal)) {
      throw new Error('Total must equal sum of items');
    }
  }
}
```

**Result**: It's IMPOSSIBLE to have an order where total ≠ sum of items.

### 3. Transaction Boundary

One transaction = One aggregate:

```typescript
async save(order: Order): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Delete + Update + Insert all happen atomically
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.order.upsert({ ... });
    await tx.orderItem.createMany({ ... });
  });
  // Either ALL succeed or NONE succeed
}
```

### 4. Immutability

All aggregate operations return NEW instances:

```typescript
class Order {
  addItem(bookId: string, quantity: number, unitPrice: Money): Order {
    const newItems = [...this._items, newItem];
    const newTotal = this.calculateTotalFromItems(newItems);

    // Return NEW Order instance
    return new Order(
      this._id,
      this._customerId,
      newItems,      // NEW items array
      newTotal,      // NEW calculated total
      this._status,
      this._createdAt,
      this._placedAt,
      this._completedAt,
      this._cancelledAt
    );
  }
}
```

---

## Request Flow: Add Item to Order

Let's trace how adding an item works through all layers:

```
1. REQUEST
   POST /orders/123/items
   Body: { bookId: "456", quantity: 2 }

   ↓

2. APPLICATION LAYER (AddItemToOrderUseCase)

   async execute(input: AddItemToOrderInput) {
     // 2.1. Find aggregate root
     const order = await orderRepository.findById(orderId);

     // 2.2. Find book (to get price)
     const book = await bookRepository.findById(bookId);
     const unitPrice = Money.create(1500, 'JPY');

     // 2.3. Delegate to aggregate root
     const updatedOrder = order.addItem(bookId, quantity, unitPrice);

     // 2.4. Save modified aggregate
     await orderRepository.save(updatedOrder);

     // 2.5. Return DTO
     return { success: true, order: toDTO(updatedOrder) };
   }

   ↓

3. DOMAIN LAYER (Order Aggregate)

   addItem(bookId: string, quantity: number, unitPrice: Money): Order {
     // 3.1. Validate can modify
     if (!this.canModify()) {
       throw new Error('Cannot modify order in this status');
     }

     // 3.2. Check if item exists
     const existingIndex = this._items.findIndex(i => i.bookId === bookId);

     // 3.3. Add or update item
     let newItems: OrderItem[];
     if (existingIndex >= 0) {
       // Update existing
       const existing = this._items[existingIndex];
       const updated = OrderItem.create(
         bookId,
         existing.quantity + quantity,
         unitPrice
       );
       newItems = [...this._items.slice(0, existingIndex),
                   updated,
                   ...this._items.slice(existingIndex + 1)];
     } else {
       // Add new
       const newItem = OrderItem.create(bookId, quantity, unitPrice);
       newItems = [...this._items, newItem];
     }

     // 3.4. Recalculate total (maintain invariant)
     const newTotal = this.calculateTotalFromItems(newItems);

     // 3.5. Return new aggregate instance
     return new Order(
       this._id,
       this._customerId,
       newItems,
       newTotal,      // ✓ Total always matches items
       this._status,
       this._createdAt,
       this._placedAt,
       this._completedAt,
       this._cancelledAt
     );
   }

   ↓

4. INFRASTRUCTURE LAYER (PrismaOrderRepository)

   async save(order: Order): Promise<void> {
     await this.prisma.$transaction(async (tx) => {
       // 4.1. Delete all existing items (simplest approach)
       await tx.orderItem.deleteMany({
         where: { orderId: order.id.getValue() }
       });

       // 4.2. Upsert order
       await tx.order.upsert({
         where: { id: order.id.getValue() },
         create: { /* order data */ },
         update: {
           totalAmount: order.total.getAmount(),  // ✓ Consistent total
           /* other fields */
         }
       });

       // 4.3. Insert all items
       await tx.orderItem.createMany({
         data: order.items.map(item => ({
           orderId: order.id.getValue(),
           bookId: item.bookId,
           quantity: item.quantity,
           unitPrice: item.unitPrice.getAmount(),
           subtotalAmount: item.subtotal.getAmount()  // ✓ Consistent subtotal
         }))
       });
     });
     // ✓ Atomic: All changes committed together
   }

   ↓

5. DATABASE

   BEGIN TRANSACTION;

   DELETE FROM order_items WHERE order_id = '123';

   UPDATE orders
   SET total_amount = 4500, currency = 'JPY'
   WHERE id = '123';

   INSERT INTO order_items (order_id, book_id, quantity, unit_price, subtotal_amount)
   VALUES ('123', '456', 2, 1500, 3000);

   COMMIT;  -- ✓ All or nothing

   ↓

6. RESPONSE
   {
     "success": true,
     "order": {
       "orderId": "123",
       "customerId": "user-789",
       "status": "DRAFT",
       "items": [
         {
           "bookId": "456",
           "quantity": 2,
           "unitPrice": { "amount": 1500, "currency": "JPY" },
           "subtotal": { "amount": 3000, "currency": "JPY" }
         }
       ],
       "total": { "amount": 3000, "currency": "JPY" },
       "itemCount": 2
     }
   }
```

**Key Points**:
- OrderItem is NEVER accessed directly - only through Order
- Total is automatically recalculated (invariant maintained)
- Entire aggregate saved in single transaction (consistency guaranteed)
- Order returned new instance (immutability preserved)

---

## State Machine: Order Status Transitions

```
┌─────────┐
│  DRAFT  │ ← Initial state (order.create())
└────┬────┘
     │
     │ order.addItem()       ✓ Can modify items
     │ order.removeItem()    ✓ Can update quantities
     │ order.updateItemQuantity()
     │
     │ order.place()         ✓ Must have items
     ↓
┌─────────┐
│ PLACED  │
└────┬────┘
     │
     ├──→ order.complete()   ✓ Successful fulfillment
     │         ↓
     │    ┌───────────┐
     │    │ COMPLETED │ ← Terminal state
     │    └───────────┘
     │
     └──→ order.cancel()     ✓ User cancellation
               ↓
          ┌───────────┐
          │ CANCELLED │ ← Terminal state
          └───────────┘

State Transition Rules (enforced by OrderStatus):

DRAFT → PLACED, CANCELLED
PLACED → COMPLETED, CANCELLED
COMPLETED → (terminal, no transitions)
CANCELLED → (terminal, no transitions)
```

**State Machine Implementation**:

```typescript
export class OrderStatus {
  canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatusValue, OrderStatusValue[]> = {
      [OrderStatusValue.DRAFT]: [
        OrderStatusValue.PLACED,
        OrderStatusValue.CANCELLED
      ],
      [OrderStatusValue.PLACED]: [
        OrderStatusValue.COMPLETED,
        OrderStatusValue.CANCELLED
      ],
      [OrderStatusValue.COMPLETED]: [], // Terminal
      [OrderStatusValue.CANCELLED]: [], // Terminal
    };

    return transitions[this.value].includes(newStatus.value);
  }
}
```

---

## Aggregate vs Entity: What's the Difference?

### Regular Entity (Lessons 1-3)

```typescript
// Book entity (Lesson 1)
export class Book {
  constructor(
    private readonly _id: string,
    private readonly _isbn: ISBN,
    private readonly _title: string,
    // ...
  ) {}

  // Simple behaviors
  borrow(userId: UserId): Book { ... }
  return(): Book { ... }
}

// ✓ Can be accessed directly
const book = await bookRepository.findById(id);

// ✓ Has its own repository
interface IBookRepository {
  save(book: Book): Promise<void>;
  findById(id: string): Promise<Book | null>;
}
```

**Characteristics**:
- Standalone entity
- Can be accessed directly
- Has its own repository
- Independent transaction boundary

### Aggregate (Lesson 4)

```typescript
// Order aggregate
export class Order {
  constructor(
    private readonly _id: OrderId,
    private readonly _items: readonly OrderItem[],  // ← Child entities
    // ...
  ) {}

  // Controls child entities
  addItem(bookId, qty, price): Order { ... }
  removeItem(bookId): Order { ... }
}

// Child entity (PROTECTED)
export class OrderItem {
  // ⚠️  Cannot be created directly from outside
  private constructor(...) {}

  // ⚠️  No repository access
  // ⚠️  Must go through Order
}

// ✓ Order is accessed directly
const order = await orderRepository.findById(id);

// ✓ Order has repository
interface IOrderRepository {
  save(order: Order): Promise<void>;  // ← Saves Order + OrderItems together
}

// ✗ OrderItem has NO repository
// ✗ Cannot access OrderItem directly
```

**Characteristics**:
- Cluster of related entities
- Only root accessible directly
- Single repository for entire aggregate
- Shared transaction boundary
- Enforces aggregate-wide invariants

---

## Comparison: Lessons 1-4

| Aspect | Lesson 1: Basic Entity | Lesson 2: Rich Domain | Lesson 3: Domain Service | Lesson 4: Aggregate |
|--------|----------------------|---------------------|------------------------|-------------------|
| **Pattern** | Repository Pattern | Immutability | Multi-Entity Coordination | Aggregate Pattern |
| **Focus** | CRUD operations | State management | Business workflows | Consistency boundaries |
| **Entities** | Book (standalone) | User (standalone) | Book + User (coordinated) | Order + OrderItem (clustered) |
| **Complexity** | Low | Medium | Medium-High | High |
| **Access** | Direct | Direct | Direct (both) | Root only |
| **Repository** | Per entity | Per entity | Per entity | Per aggregate |
| **Transaction** | Per entity | Per entity | Multiple entities | Entire aggregate |
| **Invariants** | Within entity | Within entity | Across entities | Across aggregate |

### When to Use What?

**Use Regular Entity** (Lessons 1-2) when:
- Entity is independent
- No complex relationships
- Simple business rules
- Example: Book, User (when used alone)

**Use Domain Service** (Lesson 3) when:
- Logic spans multiple entities
- No clear owner for logic
- Entities remain independent
- Example: BorrowBookService (coordinates User + Book)

**Use Aggregate** (Lesson 4) when:
- Entities must change together
- Strong consistency required
- Clear parent-child relationship
- Invariants span multiple entities
- Example: Order + OrderItems (order total must match item subtotals)

---

## Business Rules Enforced by Aggregate

### Rule 1: Total Consistency

**Rule**: Order total MUST ALWAYS equal sum of item subtotals

**Implementation**:
```typescript
private validateInvariants(): void {
  const calculatedTotal = this.calculateTotalFromItems(this._items);
  if (!this._total.equals(calculatedTotal)) {
    throw new Error('Total must equal sum of items');
  }
}

// Called in constructor → EVERY instance guarantees this
```

**Why Important**: Prevents financial inconsistencies

### Rule 2: Modification Rules

**Rule**: Items can only be modified when order is in DRAFT status

**Implementation**:
```typescript
canModify(): boolean {
  return this._status.isDraft();
}

addItem(bookId, quantity, unitPrice): Order {
  if (!this.canModify()) {
    throw new Error('Cannot modify order in this status');
  }
  // ... proceed with adding
}
```

**Why Important**: Prevents modifying confirmed orders

### Rule 3: Placement Rules

**Rule**: Order must have at least one item to be placed

**Implementation**:
```typescript
canPlace(): boolean {
  return this._items.length > 0 && this._status.isDraft();
}

place(): Order {
  if (!this.canPlace()) {
    throw new Error('Order must have items to be placed');
  }
  // ... proceed with placement
}
```

**Why Important**: Prevents empty orders

### Rule 4: State Transition Rules

**Rule**: Status transitions must follow state machine

**Implementation**:
```typescript
place(): Order {
  const newStatus = OrderStatus.placed();

  if (!this._status.canTransitionTo(newStatus)) {
    throw new Error(`Invalid transition: ${this._status} → ${newStatus}`);
  }

  return new Order(/* ... with newStatus */);
}
```

**Why Important**: Prevents invalid state changes

---

## Benefits of Aggregates

### 1. **Strong Consistency**

✓ Invariants are ALWAYS true
✓ No partial updates
✓ Atomic transactions

**Without Aggregates**:
```typescript
// ❌ Risk: Total might not match items
await orderRepository.updateTotal(orderId, 5000);
await orderItemRepository.updateQuantity(itemId, 3);
// What if second update fails? Total is wrong!
```

**With Aggregates**:
```typescript
// ✓ Safe: Total automatically calculated
const updatedOrder = order.updateItemQuantity(bookId, 3);
await orderRepository.save(updatedOrder);
// Total is guaranteed correct
```

### 2. **Simplified Transaction Management**

✓ One transaction per aggregate
✓ Clear transaction boundaries
✓ Easier to reason about

### 3. **Encapsulation**

✓ OrderItem cannot be accessed directly
✓ All operations go through Order
✓ Business rules centralized

### 4. **Testability**

✓ Can test entire aggregate in isolation
✓ No need to mock child entities
✓ Invariants easily verified

---

## Common Pitfalls

### ❌ Pitfall 1: Aggregate Too Large

**Problem**: Including too many entities in aggregate

```typescript
// ❌ BAD: Aggregate too large
class Order {
  private items: OrderItem[];
  private customer: Customer;           // Should be reference
  private shippingAddress: Address;     // Should be reference
  private paymentMethod: PaymentMethod; // Should be reference
  private invoices: Invoice[];          // Should be separate aggregate
}
```

**Solution**: Keep aggregates small

```typescript
// ✓ GOOD: Small aggregate with references
class Order {
  private items: OrderItem[];
  private customerId: string;          // Reference only
  private shippingAddressId: string;   // Reference only
  private paymentMethodId: string;     // Reference only
  // Invoices are separate aggregate
}
```

**Rule of Thumb**: If entities don't need strong consistency, use references

### ❌ Pitfall 2: Modifying Child Directly

**Problem**: Exposing child entities for modification

```typescript
// ❌ BAD: Exposing mutable collection
class Order {
  getItems(): OrderItem[] {
    return this._items; // Can be modified externally!
  }
}

// External code
order.getItems().push(newItem); // Bypasses validation!
```

**Solution**: Return read-only copy

```typescript
// ✓ GOOD: Read-only access
class Order {
  get items(): readonly OrderItem[] {
    return [...this._items]; // Returns copy
  }
}
```

### ❌ Pitfall 3: Multiple Aggregates in One Transaction

**Problem**: Modifying multiple aggregates atomically

```typescript
// ❌ BAD: Trying to maintain consistency across aggregates
async function placeOrder(orderId, inventoryId) {
  const order = await orderRepo.findById(orderId);
  const inventory = await inventoryRepo.findById(inventoryId);

  await transaction(async (tx) => {
    await tx.order.update(order.place());
    await tx.inventory.update(inventory.decreaseStock());
  });
  // What if inventory update fails? Order is placed but no stock reserved!
}
```

**Solution**: Use eventual consistency

```typescript
// ✓ GOOD: Eventual consistency via events
async function placeOrder(orderId) {
  const order = await orderRepo.findById(orderId);
  const placedOrder = order.place();

  await orderRepo.save(placedOrder);

  // Emit event for other aggregates
  await eventBus.publish(new OrderPlacedEvent(orderId, items));
  // Inventory will be updated asynchronously
}
```

**Rule**: One transaction = One aggregate

---

## Summary

### What We Learned

1. **Aggregates**: Clusters of entities with consistency boundaries
2. **Aggregate Root**: Single entry point (Order)
3. **Child Entities**: Protected entities (OrderItem)
4. **Transaction Boundaries**: One transaction per aggregate
5. **Invariants**: Rules maintained across aggregate
6. **State Machine**: Controlled status transitions

### Key Principles

✓ **One Aggregate = One Transaction**
✓ **Access Only Through Root**
✓ **Strong Consistency Within, Eventual Across**
✓ **Keep Aggregates Small**
✓ **Immutable Operations**
✓ **Enforce Invariants**

### Files Created

1. **Domain Layer**:
   - `OrderId.ts` - Value object (58 lines)
   - `OrderStatus.ts` - Value object with state machine (143 lines)
   - `Money.ts` - Value object with arithmetic (172 lines)
   - `OrderItem.ts` - Child entity (148 lines)
   - `Order.ts` - Aggregate root (489 lines) ⭐
   - `IOrderRepository.ts` - Repository interface (52 lines)

2. **Application Layer**:
   - `CreateOrderUseCase.ts` - Create order (93 lines)
   - `AddItemToOrderUseCase.ts` - Add items (154 lines)
   - `PlaceOrderUseCase.ts` - State transition (102 lines)

3. **Infrastructure Layer**:
   - `PrismaOrderRepository.ts` - Aggregate persistence (178 lines)
   - `schema.prisma` - Database schema (updated)

**Total**: ~1,589 lines of code demonstrating aggregate pattern

### Next Steps

After mastering aggregates, you're ready for:

- **Lesson 5**: Domain Events (communication between aggregates)
- **Lesson 6**: CQRS (separating reads and writes)

---

## References

- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **Aggregate Pattern**: https://martinfowler.com/bliki/DDD_Aggregate.html
