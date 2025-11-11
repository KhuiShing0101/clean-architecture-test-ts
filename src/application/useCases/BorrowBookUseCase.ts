/**
 * Borrow Book Use Case
 *
 * Application-level orchestration for borrowing books.
 * Coordinates between application concerns and domain logic.
 *
 * Application Layer Responsibilities:
 * - Find entities by ID
 * - Validate entities exist
 * - Delegate to domain service
 * - Transform domain results to DTOs
 * - Handle application-level errors
 *
 * Domain Logic (delegated to BorrowBookService):
 * - Validate business rules
 * - Coordinate entity state changes
 * - Enforce domain invariants
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { BorrowBookService } from '../../domain/services/BorrowBookService';
import { UserId } from '../../domain/valueObjects/UserId';

/**
 * Input DTO for Borrow Book Use Case
 */
export interface BorrowBookInput {
  userId: string; // 8-digit user ID
  bookId: string; // Book UUID
}

/**
 * Output DTO for Borrow Book Use Case
 */
export interface BorrowBookOutput {
  success: boolean;
  message: string;
  user?: {
    userId: string;
    name: string;
    email: string;
    currentBorrowCount: number;
    overdueFees: number;
  };
  book?: {
    bookId: string;
    title: string;
    author: string;
    status: string;
    borrowedBy: string | null;
    borrowedAt: Date | null;
  };
}

/**
 * Borrow Book Use Case
 */
export class BorrowBookUseCase {
  private readonly borrowService: BorrowBookService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {
    // Initialize domain service with repository dependencies
    this.borrowService = new BorrowBookService(userRepository, bookRepository);
  }

  /**
   * Execute the borrow book use case
   *
   * Application Flow:
   * 1. Find user (application concern)
   * 2. Find book (application concern)
   * 3. Delegate to domain service (domain logic)
   * 4. Transform to DTO (application concern)
   *
   * @param input - Borrow book input data
   * @returns Borrowing result with DTOs
   */
  async execute(input: BorrowBookInput): Promise<BorrowBookOutput> {
    // Step 1: Find user by ID (application concern - entity retrieval)
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return {
        success: false,
        message: `User not found: ${input.userId}`,
      };
    }

    // Step 2: Find book by ID (application concern - entity retrieval)
    const book = await this.bookRepository.findById(input.bookId);

    if (!book) {
      return {
        success: false,
        message: `Book not found: ${input.bookId}`,
      };
    }

    // Step 3: Execute domain service (domain logic - business rules)
    const result = await this.borrowService.execute(user, book);

    // Step 4: Transform domain result to application DTO
    if (!result.success) {
      return {
        success: false,
        message: result.error!,
      };
    }

    // Success - transform domain entities to DTOs
    return {
      success: true,
      message: 'Book borrowed successfully',
      user: result.updatedUser
        ? {
            userId: result.updatedUser.id.getValue(),
            name: result.updatedUser.name,
            email: result.updatedUser.email,
            currentBorrowCount: result.updatedUser.currentBorrowCount,
            overdueFees: result.updatedUser.overdueFees,
          }
        : undefined,
      book: result.updatedBook
        ? {
            bookId: result.updatedBook.id,
            title: result.updatedBook.title,
            author: result.updatedBook.author,
            status: result.updatedBook.status,
            borrowedBy: result.updatedBook.borrowedBy?.getValue() ?? null,
            borrowedAt: result.updatedBook.borrowedAt,
          }
        : undefined,
    };
  }
}

/**
 * Input DTO for Return Book Use Case
 */
export interface ReturnBookInput {
  userId: string; // 8-digit user ID
  bookId: string; // Book UUID
}

/**
 * Output DTO for Return Book Use Case
 */
export interface ReturnBookOutput {
  success: boolean;
  message: string;
  overdueFee?: number;
  user?: {
    userId: string;
    name: string;
    email: string;
    currentBorrowCount: number;
    overdueFees: number;
  };
  book?: {
    bookId: string;
    title: string;
    author: string;
    status: string;
  };
}

/**
 * Return Book Use Case
 */
export class ReturnBookUseCase {
  private readonly borrowService: BorrowBookService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {
    this.borrowService = new BorrowBookService(userRepository, bookRepository);
  }

  /**
   * Execute the return book use case
   *
   * @param input - Return book input data
   * @returns Return result with DTOs and overdue fee info
   */
  async execute(input: ReturnBookInput): Promise<ReturnBookOutput> {
    // Find user
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return {
        success: false,
        message: `User not found: ${input.userId}`,
      };
    }

    // Find book
    const book = await this.bookRepository.findById(input.bookId);

    if (!book) {
      return {
        success: false,
        message: `Book not found: ${input.bookId}`,
      };
    }

    // Calculate potential overdue fee before return
    const wasOverdue = book.isOverdue();
    const overdueFee = wasOverdue
      ? book.getOverdueDays() * BorrowBookService.OVERDUE_FEE_PER_DAY
      : 0;

    // Execute domain service
    const result = await this.borrowService.returnBook(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error!,
      };
    }

    // Success - transform to DTOs
    return {
      success: true,
      message: wasOverdue
        ? `Book returned with overdue fee: ¥${overdueFee}`
        : 'Book returned successfully',
      overdueFee: wasOverdue ? overdueFee : undefined,
      user: result.updatedUser
        ? {
            userId: result.updatedUser.id.getValue(),
            name: result.updatedUser.name,
            email: result.updatedUser.email,
            currentBorrowCount: result.updatedUser.currentBorrowCount,
            overdueFees: result.updatedUser.overdueFees,
          }
        : undefined,
      book: result.updatedBook
        ? {
            bookId: result.updatedBook.id,
            title: result.updatedBook.title,
            author: result.updatedBook.author,
            status: result.updatedBook.status,
          }
        : undefined,
    };
  }
}
