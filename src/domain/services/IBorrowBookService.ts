/**
 * Borrow Book Service Interface - Lesson 3
 *
 * Domain service interface for multi-entity borrowing operations.
 * Defined in domain layer, implemented in domain layer.
 *
 * Why Interface?
 * - Allows dependency injection
 * - Makes testing easier (can mock the service)
 * - Decouples application layer from concrete implementation
 * - Follows Dependency Inversion Principle
 */

import { User } from '../entities/User';
import { Book } from '../entities/Book';

/**
 * Result of borrowing operation
 */
export interface BorrowBookResult {
  success: boolean;
  error?: string;
  updatedUser?: User;
  updatedBook?: Book;
}

/**
 * Borrow Book Service Interface
 */
export interface IBorrowBookService {
  /**
   * Execute the borrowing operation
   * Coordinates User and Book entities
   *
   * @param user - User who wants to borrow
   * @param book - Book to be borrowed
   * @returns Result with updated entities or error
   */
  execute(user: User, book: Book): Promise<BorrowBookResult>;

  /**
   * Execute the return operation
   * Coordinates User and Book entities
   *
   * @param user - User who is returning
   * @param book - Book to be returned
   * @returns Result with updated entities or error
   */
  returnBook(user: User, book: Book): Promise<BorrowBookResult>;
}
