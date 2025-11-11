/**
 * Book Entity
 *
 * Represents a book in the library management system.
 * Encapsulates business logic and domain rules.
 */
import { ISBN } from '../valueObjects/ISBN';
import { v4 as uuidv4 } from 'uuid';

export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
}

export class Book {
  private constructor(
    private readonly _id: string,
    private readonly _isbn: ISBN,
    private readonly _title: string,
    private readonly _author: string,
    private _status: BookStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  /**
   * Factory method to create a new Book
   * @param isbn - ISBN string (will be validated)
   * @param title - Book title
   * @param author - Book author
   * @returns Book instance
   * @throws Error if validation fails
   */
  static create(isbn: string, title: string, author: string): Book {
    // Validation
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    if (!author || !author.trim()) {
      throw new Error('Author cannot be empty');
    }

    // Create ISBN value object (validates format)
    const isbnVO = new ISBN(isbn);
    const now = new Date();

    return new Book(
      uuidv4(),
      isbnVO,
      title.trim(),
      author.trim(),
      BookStatus.AVAILABLE,
      now,
      now
    );
  }

  /**
   * Factory method to reconstruct Book from database
   * Used by repository implementations
   */
  static reconstruct(
    id: string,
    isbn: ISBN,
    title: string,
    author: string,
    status: BookStatus,
    createdAt: Date,
    updatedAt: Date
  ): Book {
    return new Book(id, isbn, title, author, status, createdAt, updatedAt);
  }

  // Getters (encapsulation)
  get id(): string {
    return this._id;
  }

  get isbn(): ISBN {
    return this._isbn;
  }

  get title(): string {
    return this._title;
  }

  get author(): string {
    return this._author;
  }

  get status(): BookStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Business logic: Check if book can be borrowed
   */
  canBorrow(): boolean {
    return this._status === BookStatus.AVAILABLE;
  }

  /**
   * Business logic: Borrow this book
   * @throws Error if book is not available
   */
  borrow(): void {
    if (!this.canBorrow()) {
      throw new Error(
        `Book is not available for borrowing (current status: ${this._status})`
      );
    }
    this._status = BookStatus.BORROWED;
    this._updatedAt = new Date();
  }

  /**
   * Business logic: Return this book
   * @throws Error if book is not currently borrowed
   */
  returnBook(): void {
    if (this._status !== BookStatus.BORROWED) {
      throw new Error('Book is not currently borrowed');
    }
    this._status = BookStatus.AVAILABLE;
    this._updatedAt = new Date();
  }

  /**
   * Business logic: Reserve this book
   * @throws Error if book is not available
   */
  reserve(): void {
    if (this._status !== BookStatus.AVAILABLE) {
      throw new Error(
        `Book cannot be reserved (current status: ${this._status})`
      );
    }
    this._status = BookStatus.RESERVED;
    this._updatedAt = new Date();
  }

  /**
   * Business logic: Cancel reservation
   * @throws Error if book is not reserved
   */
  cancelReservation(): void {
    if (this._status !== BookStatus.RESERVED) {
      throw new Error('Book is not currently reserved');
    }
    this._status = BookStatus.AVAILABLE;
    this._updatedAt = new Date();
  }
}
