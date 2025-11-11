/**
 * Borrow Book Service Interface - Lesson 3 (FIXED)
 *
 * Domain service interface for multi-entity borrowing operations.
 * Defined in domain layer, implemented in domain layer.
 *
 * ARCHITECTURAL FIX #3:
 * =====================
 * Domain services should contain PURE BUSINESS LOGIC only.
 * - No infrastructure dependencies (no repositories!)
 * - No persistence operations (no save() calls!)
 * - Returns updated entities (application layer handles persistence)
 * - Synchronous operations (no async/await - pure domain logic)
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
 *
 * FIXED: Methods are now synchronous (no Promise)
 * Domain logic should be pure - persistence is application layer concern
 */
export interface IBorrowBookService {
  /**
   * Execute the borrowing operation
   * Coordinates User and Book entities
   *
   * PURE DOMAIN LOGIC:
   * - Validates business rules
   * - Coordinates entity state changes
   * - Returns updated entities (NO PERSISTENCE!)
   *
   * @param user - User who wants to borrow
   * @param book - Book to be borrowed
   * @returns Result with updated entities or error
   */
  execute(user: User, book: Book): BorrowBookResult;

  /**
   * Execute the return operation
   * Coordinates User and Book entities
   *
   * PURE DOMAIN LOGIC:
   * - Validates ownership
   * - Calculates overdue fees
   * - Updates entity states
   * - Returns updated entities (NO PERSISTENCE!)
   *
   * @param user - User who is returning
   * @param book - Book to be returned
   * @returns Result with updated entities or error
   */
  returnBook(user: User, book: Book): BorrowBookResult;
}
