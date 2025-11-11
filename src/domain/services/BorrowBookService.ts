/**
 * Borrow Book Domain Service ⭐ - CORE OF LESSON 3 (FIXED)
 *
 * Domain Services are used when:
 * 1. An operation involves multiple entities (User + Book)
 * 2. The logic doesn't naturally belong to one entity
 * 3. Business rules require coordination between aggregates
 * 4. The operation is a significant domain concept itself
 *
 * This service coordinates borrowing and returning books with:
 * - Multi-entity state management
 * - Transaction boundaries
 * - Complex business rules (overdue fees)
 * - Immutable state changes
 *
 * ARCHITECTURAL FIX:
 * ==================
 * Now implements IBorrowBookService interface.
 *
 * Benefits:
 * - Follows Dependency Inversion Principle
 * - Application Layer depends on interface (not concrete class)
 * - Easier testing (can mock the interface)
 * - Better separation of concerns
 */

import { User } from '../entities/User';
import { Book } from '../entities/Book';
import { IUserRepository } from '../repositories/IUserRepository';
import { IBookRepository } from '../repositories/IBookRepository';
import { IBorrowBookService, BorrowBookResult } from './IBorrowBookService';

/**
 * Domain Service for Book Borrowing Operations
 *
 * Responsibilities:
 * - Validate user eligibility (domain logic)
 * - Validate book availability (domain logic)
 * - Coordinate entity state changes
 * - Calculate overdue fees (time-based business rule)
 * - Manage transaction boundaries
 *
 * FIXED: Now implements IBorrowBookService interface
 */
export class BorrowBookService implements IBorrowBookService {
  // Business constant: Overdue fee per day (¥100)
  static readonly OVERDUE_FEE_PER_DAY = 100;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {}

  /**
   * Execute book borrowing operation
   *
   * Domain Logic Flow:
   * 1. Validate user eligibility (can borrow?)
   * 2. Validate book availability (is available?)
   * 3. Update user state (immutable)
   * 4. Update book state (immutable)
   * 5. Persist both changes (transaction boundary)
   *
   * @param user - User attempting to borrow
   * @param book - Book to be borrowed
   * @returns Result with success status and updated entities
   */
  async execute(user: User, book: Book): Promise<BorrowBookResult> {
    // Step 1: Validate user eligibility (domain business rule)
    if (!user.canBorrow()) {
      const reasons: string[] = [];
      if (user.status === 'SUSPENDED') {
        reasons.push('account is suspended');
      }
      if (user.currentBorrowCount >= 5) {
        reasons.push('maximum borrow limit reached (5 books)');
      }
      if (user.overdueFees > 0) {
        reasons.push(`has overdue fees of ¥${user.overdueFees}`);
      }

      return {
        success: false,
        error: `User not eligible to borrow: ${reasons.join(', ')}`,
      };
    }

    // Step 2: Validate book availability (domain business rule)
    if (!book.isAvailable()) {
      return {
        success: false,
        error: `Book is not available (current status: ${book.status})`,
      };
    }

    // Step 3: Update user state (immutable - from Lesson 2)
    const updatedUser = user.borrowBook();

    // Step 4: Update book state (immutable - from Lesson 2)
    const updatedBook = book.borrow(user.id);

    // Step 5: Persist both changes (transaction boundary)
    // In production: wrap in database transaction for atomicity
    await this.userRepository.save(updatedUser);
    await this.bookRepository.save(updatedBook);

    return {
      success: true,
      updatedUser,
      updatedBook,
    };
  }

  /**
   * Execute book return operation
   *
   * Domain Logic Flow:
   * 1. Validate ownership (borrowed by this user?)
   * 2. Calculate overdue fees if applicable
   * 3. Update user state (decrement count + add fees if overdue)
   * 4. Update book state (mark as available)
   * 5. Persist both changes (transaction boundary)
   *
   * @param user - User returning the book
   * @param book - Book being returned
   * @returns Result with success status and updated entities
   */
  async returnBook(user: User, book: Book): Promise<BorrowBookResult> {
    // Step 1: Validate ownership
    if (!book.borrowedBy || !book.borrowedBy.equals(user.id)) {
      return {
        success: false,
        error: 'This book was not borrowed by this user',
      };
    }

    // Step 2: Update user state (return book)
    let updatedUser = user.returnBook();

    // Step 3: Apply overdue fees if book is overdue (complex business rule)
    if (book.isOverdue()) {
      const overdueDays = book.getOverdueDays();
      const overdueFee = overdueDays * BorrowBookService.OVERDUE_FEE_PER_DAY;

      // Add fee to user (immutable operation)
      updatedUser = updatedUser.addOverdueFee(overdueFee);
    }

    // Step 4: Update book state (mark as returned)
    const updatedBook = book.returnBook();

    // Step 5: Persist both changes (transaction boundary)
    // In production: wrap in database transaction for atomicity
    await this.userRepository.save(updatedUser);
    await this.bookRepository.save(updatedBook);

    return {
      success: true,
      updatedUser,
      updatedBook,
    };
  }
}
