# Lesson 2: User Management - Rich Domain Model Flow Diagram

## Overview

**Lesson 2: User Management System**
- **Focus**: Rich Domain Models + Immutability + Complex Business Rules
- **Domain**: User Entity + UserId Value Object
- **Pattern**: Immutable state changes (return new instances)
- **Use Case**: Create user with borrowing limits and fee management

---

## Complete Architecture Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         LESSON 2: USER MANAGEMENT                           │
│           Domain: User Entity + UserId Value Object (Rich Model)            │
└────────────────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════════════╗
║                         PRESENTATION LAYER (Future)                       ║
║                                                                           ║
║  POST /api/users                                                          ║
║  {                                                                        ║
║    "name": "John Doe",                                                   ║
║    "email": "john@example.com"                                           ║
║  }                                                                        ║
╚═══════════════════════════════════════╦══════════════════════════════════╝
                                        │
                                        │ HTTP Request
                                        ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                          APPLICATION LAYER                                ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  CreateUserUseCase.execute(input)                                │    ║
║  │                                                                   │    ║
║  │  Step 1: Check Email Uniqueness                                  │    ║
║  │  ┌──────────────────────────────────────────┐                   │    ║
║  │  │ const existing = await                   │                   │    ║
║  │  │   userRepository.findByEmail(email)      │───────┐           │    ║
║  │  │ if (existing) throw Error                │       │           │    ║
║  │  └──────────────────────────────────────────┘       │           │    ║
║  │                                                      │           │    ║
║  │  Step 2: Create User Entity                         │           │    ║
║  │  ┌──────────────────────────────────────────┐       │           │    ║
║  │  │ const user = User.create(                │       │           │    ║
║  │  │   name, email                            │───────┼───┐       │    ║
║  │  │ )  // Generates UserId internally        │       │   │       │    ║
║  │  └──────────────────────────────────────────┘       │   │       │    ║
║  │                                                      │   │       │    ║
║  │  Step 3: Persist                                    │   │       │    ║
║  │  ┌──────────────────────────────────────────┐       │   │       │    ║
║  │  │ await userRepository.save(user)          │───────┘   │       │    ║
║  │  └──────────────────────────────────────────┘           │       │    ║
║  │                                                          │       │    ║
║  │  Step 4: Return DTO                                     │       │    ║
║  │  ┌──────────────────────────────────────────┐           │       │    ║
║  │  │ return { userId, name, email, ... }      │           │       │    ║
║  │  └──────────────────────────────────────────┘           │       │    ║
║  └───────────────────────────────────────────────────────────────────┘    ║
╚═══════════════════════════════════════╦══════════════════════════════════╝
                                        │ │       │
                    ┌───────────────────┘ │       │
                    │   ┌─────────────────┘       │
                    │   │                         │
                    ▼   ▼                         ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                            DOMAIN LAYER                                   ║
║                (Rich Domain Model - Behavior + Data)                      ║
║                                                                           ║
║  ┌──────────────────────────┐  ┌────────────────────────────────────┐   ║
║  │  Value Object            │  │  Entity (RICH MODEL)                │   ║
║  │  ┌────────────────────┐  │  │  ┌──────────────────────────────┐  │   ║
║  │  │ UserId             │◄─┼──┼──┤ User                          │  │   ║
║  │  │                    │  │  │  │                               │  │   ║
║  │  │ - value: string    │  │  │  │ Data:                         │  │   ║
║  │  │   (8 digits)       │  │  │  │ - id: UserId ◄────────────────┼──┼──┐
║  │  │                    │  │  │  │ - name: string                │  │  │
║  │  │ Methods:           │  │  │  │ - email: string               │  │  │
║  │  │ ✓ create(value)    │  │  │  │ - status: UserStatus          │  │  │
║  │  │ ✓ generate() ◄─────┼──┼──┼──┤ - currentBorrowCount: number  │  │  │
║  │  │ ✓ getValue()       │  │  │  │ - overdueFees: number         │  │  │
║  │  │ ✓ equals()         │  │  │  │ - createdAt: Date             │  │  │
║  │  └────────────────────┘  │  │  │                               │  │  │
║  └──────────────────────────┘  │  │ Constants:                    │  │  │
║                                │  │ • MAX_BORROW_LIMIT = 5        │  │  │
║                                │  │                               │  │  │
║                                │  │ Factory Methods:              │  │  │
║                                │  │ ✓ create() ◄──────────────────┼──┼──┤
║                                │  │ ✓ reconstruct()               │  │  │
║                                │  │                               │  │  │
║                                │  │ Business Logic (IMMUTABLE):   │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ canBorrow(): boolean     │  │  │  │
║                                │  │ │ • Check SUSPENDED        │  │  │  │
║                                │  │ │ • Check MAX_LIMIT        │  │  │  │
║                                │  │ │ • Check overdueFees > 0  │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  │                               │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ borrowBook(): User       │  │  │  │
║                                │  │ │ • Validate canBorrow()   │  │  │  │
║                                │  │ │ • return NEW User(       │  │  │  │
║                                │  │ │     count + 1            │  │  │  │
║                                │  │ │   )                      │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  │                               │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ returnBook(): User       │  │  │  │
║                                │  │ │ • Validate count > 0     │  │  │  │
║                                │  │ │ • return NEW User(       │  │  │  │
║                                │  │ │     count - 1            │  │  │  │
║                                │  │ │   )                      │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  │                               │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ addOverdueFee(n): User   │  │  │  │
║                                │  │ │ • Validate n > 0         │  │  │  │
║                                │  │ │ • return NEW User(       │  │  │  │
║                                │  │ │     fees + n             │  │  │  │
║                                │  │ │   )                      │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  │                               │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ payOverdueFee(n): User   │  │  │  │
║                                │  │ │ • Validate n <= fees     │  │  │  │
║                                │  │ │ • return NEW User(       │  │  │  │
║                                │  │ │     fees - n             │  │  │  │
║                                │  │ │   )                      │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  │                               │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ suspend(): User          │  │  │  │
║                                │  │ │ • return NEW User(       │  │  │  │
║                                │  │ │     status: SUSPENDED    │  │  │  │
║                                │  │ │   )                      │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  │                               │  │  │
║                                │  │ ┌──────────────────────────┐  │  │  │
║                                │  │ │ activate(): User         │  │  │  │
║                                │  │ │ • return NEW User(       │  │  │  │
║                                │  │ │     status: ACTIVE       │  │  │  │
║                                │  │ │   )                      │  │  │  │
║                                │  │ └──────────────────────────┘  │  │  │
║                                │  └──────────────────────────────┘  │  │
║                                └────────────────────────────────────┘  │
║                                                                         │
║  ┌──────────────────────────────────────────────────────────────────┐  │
║  │  Repository Interface (Extended Contract)                         │  │
║  │  ┌────────────────────────────────────────────────────────────┐  │  │
║  │  │ IUserRepository                                             │  │  │
║  │  │                                                             │  │  │
║  │  │ Standard Methods:                                           │  │  │
║  │  │ - save(user: User): Promise<void>                          │  │  │
║  │  │ - findById(id: UserId): Promise<User | null>               │  │  │
║  │  │ - findAll(): Promise<User[]>                               │  │  │
║  │  │ - delete(id: UserId): Promise<void>                        │  │  │
║  │  │                                                             │  │  │
║  │  │ Domain-Specific Queries:                                    │  │  │
║  │  │ - findByEmail(email): Promise<User | null> ◄───────────────┼──┼──┘
║  │  │ - findUsersWithOverdueFees(): Promise<User[]>              │  │
║  │  └────────────────────────────────────────────────────────────┘  │
║  └──────────────────────────────────────────────────────────────────┘  │
╚═══════════════════════════════════════╦══════════════════════════════════╝
                                        ▲
                                        │ implements
                                        │
╔══════════════════════════════════════════════════════════════════════════╗
║                       INFRASTRUCTURE LAYER                                ║
║                                                                           ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │  PrismaUserRepository implements IUserRepository                 │   ║
║  │                                                                   │   ║
║  │  ┌────────────────────────────────────────────────────────────┐ │   ║
║  │  │ - prisma: PrismaClient                                      │ │   ║
║  │  │                                                             │ │   ║
║  │  │ save(user: User): Promise<void> {                          │ │   ║
║  │  │   await prisma.user.upsert({                               │ │   ║
║  │  │     where: { id: user.id.getValue() },                     │ │   ║
║  │  │     update: { name, email, status, ... },                  │ │   ║
║  │  │     create: { id, name, email, ... }                       │ │   ║
║  │  │   })                                                        │ │   ║
║  │  │ }                                                           │ │   ║
║  │  │                                                             │ │   ║
║  │  │ findByEmail(email: string): Promise<User | null> {         │ │   ║
║  │  │   const record = await prisma.user.findUnique({            │ │   ║
║  │  │     where: { email: email.toLowerCase() }                  │ │   ║
║  │  │   })                                                        │ │   ║
║  │  │   return record ? this.toDomain(record) : null             │ │   ║
║  │  │ }                                                           │ │   ║
║  │  │                                                             │ │   ║
║  │  │ findUsersWithOverdueFees(): Promise<User[]> {              │ │   ║
║  │  │   const records = await prisma.user.findMany({             │ │   ║
║  │  │     where: { overdueFees: { gt: 0 } }                      │ │   ║
║  │  │   })                                                        │ │   ║
║  │  │   return records.map(r => this.toDomain(r))                │ │   ║
║  │  │ }                                                           │ │   ║
║  │  │                                                             │ │   ║
║  │  │ private toDomain(record): User {                           │ │   ║
║  │  │   // Convert database record → domain entity               │ │   ║
║  │  │   const userId = UserId.create(record.id)                  │ │   ║
║  │  │   return User.reconstruct(userId, name, email, ...)        │ │   ║
║  │  │ }                                                           │ │   ║
║  │  └────────────────────────────────────────────────────────────┘ │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════╦══════════════════════════════════╝
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │   PostgreSQL Database │
                            │                       │
                            │   Table: users        │
                            │   - id (8 digits)     │
                            │   - name              │
                            │   - email (unique)    │
                            │   - status            │
                            │   - current_borrow_   │
                            │     count             │
                            │   - overdue_fees      │
                            │   - created_at        │
                            └───────────────────────┘
```

---

## Immutability Pattern - The Core Concept

### Scenario: User Borrows a Book

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 1: Load User from Database                                         │
└─────────────────────────────────────────────────────────────────────────┘

   const user = await userRepository.findById(userId)

   User {
     id: UserId("12345678")
     name: "John Doe"
     email: "john@example.com"
     status: ACTIVE
     currentBorrowCount: 2  ◄─── Current state
     overdueFees: 0
     createdAt: 2025-01-01
   }

┌─────────────────────────────────────────────────────────────────────────┐
│ Step 2: Business Logic Validation                                       │
└─────────────────────────────────────────────────────────────────────────┘

   user.canBorrow()
   ├─ Check: status === ACTIVE? ✓
   ├─ Check: currentBorrowCount < 5? ✓ (2 < 5)
   └─ Check: overdueFees === 0? ✓

   Result: true ✓

┌─────────────────────────────────────────────────────────────────────────┐
│ Step 3: Immutable State Change (Returns NEW Instance)                   │
└─────────────────────────────────────────────────────────────────────────┘

   const updatedUser = user.borrowBook()  ◄─── Returns NEW User

   ┌──────────────────────────┐          ┌──────────────────────────┐
   │ Original User            │          │ New User                 │
   │ (Still exists in memory) │          │ (Returned by method)     │
   ├──────────────────────────┤          ├──────────────────────────┤
   │ id: "12345678"           │          │ id: "12345678"           │
   │ name: "John Doe"         │          │ name: "John Doe"         │
   │ email: "john@..."        │          │ email: "john@..."        │
   │ status: ACTIVE           │          │ status: ACTIVE           │
   │ currentBorrowCount: 2    │   ───►   │ currentBorrowCount: 3    │ ◄── CHANGED
   │ overdueFees: 0           │          │ overdueFees: 0           │
   │ createdAt: 2025-01-01    │          │ createdAt: 2025-01-01    │
   └──────────────────────────┘          └──────────────────────────┘
        NOT MODIFIED!                         NEW INSTANCE!

┌─────────────────────────────────────────────────────────────────────────┐
│ Step 4: Persist New State                                               │
└─────────────────────────────────────────────────────────────────────────┘

   await userRepository.save(updatedUser)  ◄─── Save the NEW instance

   Database UPDATE:
   UPDATE users
   SET current_borrow_count = 3
   WHERE id = '12345678'
```

---

## Rich Domain Model vs Anemic Domain Model

### ❌ ANEMIC DOMAIN MODEL (Bad - What NOT to do)

```typescript
// Just a data container - NO BEHAVIOR
class User {
  id: string;
  name: string;
  currentBorrowCount: number;
  overdueFees: number;
}

// Business logic in USE CASE (WRONG LAYER!)
class BorrowBookUseCase {
  async execute(userId: string) {
    const user = await this.repo.findById(userId);

    // ❌ Business rules in use case
    if (user.currentBorrowCount >= 5) {
      throw new Error("Max limit reached");
    }

    // ❌ Direct mutation
    user.currentBorrowCount++;

    await this.repo.save(user);
  }
}
```

**Problems:**
- ❌ Business logic scattered across use cases
- ❌ Easy to bypass validation
- ❌ Not reusable
- ❌ Direct mutation (not thread-safe)
- ❌ Entity is just a data bag

---

### ✅ RICH DOMAIN MODEL (Good - Lesson 2 approach)

```typescript
// Entity WITH BEHAVIOR
class User {
  static readonly MAX_BORROW_LIMIT = 5;

  // ✅ Business logic in domain entity
  canBorrow(): boolean {
    if (this.status === UserStatus.SUSPENDED) return false;
    if (this.currentBorrowCount >= User.MAX_BORROW_LIMIT) return false;
    if (this.overdueFees > 0) return false;
    return true;
  }

  // ✅ Immutable state change
  borrowBook(): User {
    if (!this.canBorrow()) {
      throw new Error("Cannot borrow books");
    }

    // Return NEW instance
    return new User(
      this.id,
      this.name,
      this.email,
      this.status,
      this.currentBorrowCount + 1,  // ← State change
      this.overdueFees,
      this.createdAt
    );
  }
}

// Use case just ORCHESTRATES
class BorrowBookUseCase {
  async execute(userId: string) {
    const user = await this.repo.findById(userId);

    // ✅ Domain handles validation and logic
    const updatedUser = user.borrowBook();

    await this.repo.save(updatedUser);
  }
}
```

**Benefits:**
- ✅ Business logic centralized in domain
- ✅ Cannot bypass validation
- ✅ Reusable across use cases
- ✅ Thread-safe (immutability)
- ✅ Self-documenting
- ✅ Easy to test

---

## Business Rules Enforcement

### Complex Multi-Rule Validation

```typescript
canBorrow(): boolean {
  // Rule 1: User must be ACTIVE
  if (this._status === UserStatus.SUSPENDED) {
    return false;
  }

  // Rule 2: User must be below MAX_BORROW_LIMIT
  if (this._currentBorrowCount >= User.MAX_BORROW_LIMIT) {
    return false;
  }

  // Rule 3: User must have no overdue fees
  if (this._overdueFees > 0) {
    return false;
  }

  return true;
}
```

### Detailed Error Messages

```typescript
borrowBook(): User {
  if (!this.canBorrow()) {
    const reasons: string[] = [];

    if (this._status === UserStatus.SUSPENDED) {
      reasons.push('account is suspended');
    }
    if (this._currentBorrowCount >= User.MAX_BORROW_LIMIT) {
      reasons.push(`already borrowed ${User.MAX_BORROW_LIMIT} books`);
    }
    if (this._overdueFees > 0) {
      reasons.push(`has overdue fees of $${this._overdueFees}`);
    }

    throw new Error(`User cannot borrow books: ${reasons.join(', ')}`);
  }

  // ... return new instance
}
```

---

## Step-by-Step Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. API REQUEST                                                   │
└─────────────────────────────────────────────────────────────────┘

POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com"
}

                    ↓

┌─────────────────────────────────────────────────────────────────┐
│ 2. USE CASE EXECUTION - CreateUserUseCase.execute()             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Step 1: Check Email Uniqueness                                │
└──────────────────────────────────────────────────────────────┘
const existingUser = await userRepository.findByEmail("john@example.com")
    ↓
IUserRepository Interface → PrismaUserRepository Implementation
    ↓
Prisma Query: SELECT * FROM users WHERE email = 'john@example.com'
    ↓
Result: null (not found) ✓

┌──────────────────────────────────────────────────────────────┐
│ Step 2: Create User Entity                                    │
└──────────────────────────────────────────────────────────────┘
const user = User.create("John Doe", "john@example.com")
    ↓
✓ Validates name not empty
✓ Validates email contains @
✓ Generates 8-digit UserId: UserId.generate()
    → Random ID: "12345678"
✓ Sets status to ACTIVE
✓ Sets currentBorrowCount to 0
✓ Sets overdueFees to 0
✓ Sets createdAt timestamp
    ↓
Result: User{
  id: UserId("12345678"),
  name: "John Doe",
  email: "john@example.com",
  status: ACTIVE,
  currentBorrowCount: 0,
  overdueFees: 0,
  createdAt: 2025-11-11T...
}

┌──────────────────────────────────────────────────────────────┐
│ Step 3: Persist to Repository                                │
└──────────────────────────────────────────────────────────────┘
await userRepository.save(user)
    ↓
IUserRepository Interface → PrismaUserRepository Implementation
    ↓
Prisma Query:
INSERT INTO users (id, name, email, status, current_borrow_count, overdue_fees, created_at)
VALUES ('12345678', 'John Doe', 'john@example.com', 'ACTIVE', 0, 0, ...)
    ↓
✓ User saved to database

┌──────────────────────────────────────────────────────────────┐
│ Step 4: Return DTO                                            │
└──────────────────────────────────────────────────────────────┘
return {
  userId: "12345678",
  name: "John Doe",
  email: "john@example.com",
  status: "ACTIVE",
  currentBorrowCount: 0,
  overdueFees: 0,
  createdAt: 2025-11-11T...
}

                    ↓

┌─────────────────────────────────────────────────────────────────┐
│ 3. API RESPONSE                                                  │
└─────────────────────────────────────────────────────────────────┘

HTTP 201 Created
{
  "userId": "12345678",
  "name": "John Doe",
  "email": "john@example.com",
  "status": "ACTIVE",
  "currentBorrowCount": 0,
  "overdueFees": 0,
  "createdAt": "2025-11-11T..."
}
```

---

## Benefits of Immutability

### 1. Thread Safety
```
No race conditions from concurrent modifications
Multiple threads can read the same User instance safely
```

### 2. Predictability
```
State changes are explicit and traceable
You always know when state changes (method returns new instance)
```

### 3. Debugging
```
Previous states preserved in call stack
Can see both old and new state during debugging
```

### 4. Event Sourcing
```
Natural fit for event-driven systems
Each state change can be an event
```

### 5. Testing
```
Easier to test with predictable state
No hidden mutations that affect other tests
```

---

## File Structure

```
src/
├── domain/                             # Pure business logic
│   ├── entities/
│   │   └── User.ts                     # Rich User entity (318 lines)
│   ├── valueObjects/
│   │   └── UserId.ts                   # UserId with 8-digit validation
│   └── repositories/
│       └── IUserRepository.ts          # Extended repository interface
│
├── application/                        # Use cases (workflows)
│   └── useCases/
│       └── CreateUserUseCase.ts        # User creation orchestration
│
└── infrastructure/                     # External dependencies
    └── persistence/
        └── PrismaUserRepository.ts     # Prisma/PostgreSQL implementation

prisma/
└── schema.prisma                       # User model + UserStatus enum
```

---

## Key Takeaways

### ✅ What Lesson 2 Teaches:

1. **Rich Domain Models**: Entities with behavior, not just data
2. **Value Objects**: UserId with generation capability
3. **Immutability Pattern**: All state changes return new instances
4. **Complex Business Rules**: Multi-condition validation (MAX_LIMIT, fees, status)
5. **Domain Constants**: Business rules defined as constants (MAX_BORROW_LIMIT = 5)
6. **Domain-Specific Queries**: Repository methods for business logic (findUsersWithOverdueFees)
7. **Self-Validation**: Entities enforce their own invariants
8. **Factory Methods**: Static methods for creation and reconstruction

### 📊 Complexity Level: ⭐⭐⭐⭐ (Advanced)

- Rich entity with extensive business logic
- Immutability pattern throughout
- Complex multi-rule validation
- Domain-specific repository queries
- Multiple state transitions (borrow, return, suspend, fees)

### 🎯 Lesson 2 vs Lesson 1:

| Aspect | Lesson 1 (Book) | Lesson 2 (User) |
|--------|----------------|----------------|
| **Complexity** | Basic entity | Rich domain model |
| **Value Objects** | ISBN (validation) | UserId (generation) |
| **Business Logic** | Simple (status changes) | Complex (limits, fees, status) |
| **State Changes** | Mutable | **Immutable** |
| **Validation** | Format validation | Multi-rule business validation |
| **Repository** | Standard queries | Domain-specific queries |

### 🚀 Advanced Patterns Introduced:

- ✅ Immutability pattern (returns new instances)
- ✅ Rich domain models (behavior + data)
- ✅ Business constants (MAX_BORROW_LIMIT)
- ✅ Complex validation (canBorrow with 3 rules)
- ✅ Detailed error messages (explains WHY operation failed)
- ✅ Domain-specific repository methods
- ✅ Value object generation (UserId.generate())
