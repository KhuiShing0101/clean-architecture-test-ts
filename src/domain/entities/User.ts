/**
 * User Entity - Rich Domain Model
 *
 * Demonstrates a rich domain model with encapsulated business logic.
 * This is NOT an anemic domain model - it contains behavior, not just data.
 *
 * Key Features:
 * - Business logic encapsulated in the entity
 * - Immutable state changes (returns new instances)
 * - Self-validating invariants
 * - Domain constants for business rules
 */

import { UserId } from '../valueObjects/UserId';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class User {
  // Business constant - defined in domain
  static readonly MAX_BORROW_LIMIT = 5;

  private constructor(
    private readonly _id: UserId,
    private readonly _name: string,
    private readonly _email: string,
    private readonly _status: UserStatus,
    private readonly _currentBorrowCount: number,
    private readonly _overdueFees: number,
    private readonly _createdAt: Date
  ) {
    // Invariant validation
    if (_currentBorrowCount < 0) {
      throw new Error('Borrow count cannot be negative');
    }
    if (_overdueFees < 0) {
      throw new Error('Overdue fees cannot be negative');
    }
  }

  /**
   * Factory method to create a new User
   * @param name - User's full name
   * @param email - User's email address
   * @returns New User instance
   */
  static create(name: string, email: string): User {
    // Validation
    if (!name || !name.trim()) {
      throw new Error('Name cannot be empty');
    }
    if (!email || !email.trim() || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    return new User(
      UserId.generate(),
      name.trim(),
      email.trim().toLowerCase(),
      UserStatus.ACTIVE,
      0, // No books borrowed initially
      0, // No overdue fees initially
      new Date()
    );
  }

  /**
   * Factory method to reconstruct User from database
   * Used by repository implementations
   */
  static reconstruct(
    id: UserId,
    name: string,
    email: string,
    status: UserStatus,
    currentBorrowCount: number,
    overdueFees: number,
    createdAt: Date
  ): User {
    return new User(
      id,
      name,
      email,
      status,
      currentBorrowCount,
      overdueFees,
      createdAt
    );
  }

  // Getters (encapsulation)
  get id(): UserId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get status(): UserStatus {
    return this._status;
  }

  get currentBorrowCount(): number {
    return this._currentBorrowCount;
  }

  get overdueFees(): number {
    return this._overdueFees;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Business Logic: Check if user can borrow books
   *
   * Business Rules:
   * - User must be ACTIVE (not suspended)
   * - User must be below MAX_BORROW_LIMIT
   * - User must have no overdue fees
   */
  canBorrow(): boolean {
    if (this._status === UserStatus.SUSPENDED) {
      return false;
    }
    if (this._currentBorrowCount >= User.MAX_BORROW_LIMIT) {
      return false;
    }
    if (this._overdueFees > 0) {
      return false;
    }
    return true;
  }

  /**
   * Business Logic: Borrow a book
   * Returns a NEW User instance (immutability pattern)
   *
   * @throws Error if user cannot borrow
   */
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

    // Return NEW instance with updated state (immutability)
    return new User(
      this._id,
      this._name,
      this._email,
      this._status,
      this._currentBorrowCount + 1, // ← State change
      this._overdueFees,
      this._createdAt
    );
  }

  /**
   * Business Logic: Return a book
   * Returns a NEW User instance (immutability pattern)
   *
   * @throws Error if user has no borrowed books
   */
  returnBook(): User {
    if (this._currentBorrowCount === 0) {
      throw new Error('User has no books to return');
    }

    // Return NEW instance with updated state (immutability)
    return new User(
      this._id,
      this._name,
      this._email,
      this._status,
      this._currentBorrowCount - 1, // ← State change
      this._overdueFees,
      this._createdAt
    );
  }

  /**
   * Business Logic: Add overdue fees
   * Returns a NEW User instance (immutability pattern)
   *
   * @param amount - Fee amount to add (must be positive)
   * @throws Error if amount is invalid
   */
  addOverdueFee(amount: number): User {
    if (amount <= 0) {
      throw new Error('Overdue fee amount must be positive');
    }

    // Return NEW instance with updated state (immutability)
    return new User(
      this._id,
      this._name,
      this._email,
      this._status,
      this._currentBorrowCount,
      this._overdueFees + amount, // ← State change
      this._createdAt
    );
  }

  /**
   * Business Logic: Pay overdue fees
   * Returns a NEW User instance (immutability pattern)
   *
   * @param amount - Payment amount (must not exceed current fees)
   * @throws Error if amount is invalid
   */
  payOverdueFee(amount: number): User {
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
    if (amount > this._overdueFees) {
      throw new Error(
        `Payment amount ($${amount}) exceeds current fees ($${this._overdueFees})`
      );
    }

    // Return NEW instance with updated state (immutability)
    return new User(
      this._id,
      this._name,
      this._email,
      this._status,
      this._currentBorrowCount,
      this._overdueFees - amount, // ← State change
      this._createdAt
    );
  }

  /**
   * Business Logic: Suspend user account
   * Returns a NEW User instance (immutability pattern)
   *
   * @throws Error if already suspended
   */
  suspend(): User {
    if (this._status === UserStatus.SUSPENDED) {
      throw new Error('User is already suspended');
    }

    // Return NEW instance with updated state (immutability)
    return new User(
      this._id,
      this._name,
      this._email,
      UserStatus.SUSPENDED, // ← State change
      this._currentBorrowCount,
      this._overdueFees,
      this._createdAt
    );
  }

  /**
   * Business Logic: Activate user account
   * Returns a NEW User instance (immutability pattern)
   *
   * @throws Error if already active
   */
  activate(): User {
    if (this._status === UserStatus.ACTIVE) {
      throw new Error('User is already active');
    }

    // Return NEW instance with updated state (immutability)
    return new User(
      this._id,
      this._name,
      this._email,
      UserStatus.ACTIVE, // ← State change
      this._currentBorrowCount,
      this._overdueFees,
      this._createdAt
    );
  }
}
