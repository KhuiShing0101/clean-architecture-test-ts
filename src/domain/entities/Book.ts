/**
 * Book Entity - Enhanced for Lesson 3
 *
 * Represents a book in the library management system with borrowing capabilities.
 * Demonstrates multi-entity operations and time-based business rules.
 *
 * Key Features for Lesson 3:
 * - Borrower tracking (UserId)
 * - Borrow/return timestamps
 * - Overdue calculation (14-day limit)
 * - Immutable state changes (Lesson 2 pattern)
 */

import { ISBN } from '../valueObjects/ISBN';
import { UserId } from '../valueObjects/UserId';
import { v4 as uuidv4 } from 'uuid';

export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
}

export class Book {
  // Business constant: 14-day borrowing period
  static readonly BORROW_PERIOD_DAYS = 14;

  private constructor(
    private readonly _id: string,
    private readonly _isbn: ISBN,
    private readonly _title: string,
    private readonly _author: string,
    private readonly _status: BookStatus,
    private readonly _borrowedBy: UserId | null,
    private readonly _borrowedAt: Date | null,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date
  ) {}

  static create(isbn: string, title: string, author: string): Book {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    if (!author || !author.trim()) {
      throw new Error('Author cannot be empty');
    }

    const isbnVO = new ISBN(isbn);
    const now = new Date();

    return new Book(
      uuidv4(),
      isbnVO,
      title.trim(),
      author.trim(),
      BookStatus.AVAILABLE,
      null,
      null,
      now,
      now
    );
  }

  static reconstruct(
    id: string,
    isbn: ISBN,
    title: string,
    author: string,
    status: BookStatus,
    borrowedBy: UserId | null,
    borrowedAt: Date | null,
    createdAt: Date,
    updatedAt: Date
  ): Book {
    return new Book(id, isbn, title, author, status, borrowedBy, borrowedAt, createdAt, updatedAt);
  }

  get id(): string { return this._id; }
  get isbn(): ISBN { return this._isbn; }
  get title(): string { return this._title; }
  get author(): string { return this._author; }
  get status(): BookStatus { return this._status; }
  get borrowedBy(): UserId | null { return this._borrowedBy; }
  get borrowedAt(): Date | null { return this._borrowedAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  isAvailable(): boolean {
    return this._status === BookStatus.AVAILABLE;
  }

  borrow(userId: UserId): Book {
    if (!this.isAvailable()) {
      throw new Error(`Book is not available for borrowing (current status: ${this._status})`);
    }

    return new Book(
      this._id,
      this._isbn,
      this._title,
      this._author,
      BookStatus.BORROWED,
      userId,
      new Date(),
      this._createdAt,
      new Date()
    );
  }

  returnBook(): Book {
    if (this._status !== BookStatus.BORROWED) {
      throw new Error('Book is not currently borrowed');
    }

    return new Book(
      this._id,
      this._isbn,
      this._title,
      this._author,
      BookStatus.AVAILABLE,
      null,
      null,
      this._createdAt,
      new Date()
    );
  }

  isOverdue(): boolean {
    if (this._status !== BookStatus.BORROWED || !this._borrowedAt) {
      return false;
    }

    const now = new Date();
    const borrowedMs = this._borrowedAt.getTime();
    const nowMs = now.getTime();
    const daysDiff = (nowMs - borrowedMs) / (1000 * 60 * 60 * 24);

    return daysDiff > Book.BORROW_PERIOD_DAYS;
  }

  getOverdueDays(): number {
    if (!this.isOverdue() || !this._borrowedAt) {
      return 0;
    }

    const now = new Date();
    const borrowedMs = this._borrowedAt.getTime();
    const nowMs = now.getTime();
    const daysDiff = (nowMs - borrowedMs) / (1000 * 60 * 60 * 24);

    return Math.floor(daysDiff - Book.BORROW_PERIOD_DAYS);
  }

  reserve(): Book {
    if (this._status !== BookStatus.AVAILABLE) {
      throw new Error(`Book cannot be reserved (current status: ${this._status})`);
    }

    return new Book(
      this._id,
      this._isbn,
      this._title,
      this._author,
      BookStatus.RESERVED,
      this._borrowedBy,
      this._borrowedAt,
      this._createdAt,
      new Date()
    );
  }

  cancelReservation(): Book {
    if (this._status !== BookStatus.RESERVED) {
      throw new Error('Book is not currently reserved');
    }

    return new Book(
      this._id,
      this._isbn,
      this._title,
      this._author,
      BookStatus.AVAILABLE,
      this._borrowedBy,
      this._borrowedAt,
      this._createdAt,
      new Date()
    );
  }
}
