/**
 * Borrow Book Use Case - FIXED (Lesson 3)
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
 *
 * ARCHITECTURAL FIX:
 * ==================
 * Input DTOs now receive VALUE OBJECTS instead of primitive strings.
 *
 * Benefits:
 * - Validation happens at application boundary (not inside use case)
 * - Better encapsulation of domain rules
 * - Type safety - cannot pass invalid IDs
 * - Presentation layer handles primitive-to-value-object conversion
 *
 * Flow:
 * 1. HTTP Request: { userId: "12345678" } (string)
 * 2. Presentation Layer: Converts to UserId.create("12345678") (validates!)
 * 3. Application Layer: Receives UserId value object (already validated)
 * 4. Use Case: Works with validated value object directly
 *
 * Example (Presentation Layer):
 * ```typescript
 * class BorrowBookController {
 *   async borrowBook(req: Request, res: Response) {
 *     try {
 *       // Convert primitives to value objects HERE
 *       const userId = UserId.create(req.body.userId); // Validates!
 *
 *       // Call use case with value objects
 *       const result = await borrowBookUseCase.execute({
 *         userId,  // Already validated UserId
 *         bookId: req.body.bookId
 *       });
 *
 *       res.json(result);
 *     } catch (error) {
 *       // Handle validation errors at presentation boundary
 *       res.status(400).json({ error: error.message });
 *     }
 *   }
 * }
 * ```
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { BorrowBookService } from '../../domain/services/BorrowBookService';
import { UserId } from '../../domain/valueObjects/UserId';

/**
 * Input DTO for Borrow Book Use Case
 *
 * UPDATED (Lesson 3 - Fixed):
 * - Uses value objects instead of primitive strings
 * - Validation happens at application boundary (before use case)
 * - Presentation layer converts strings to value objects
 * - Use case receives validated value objects
 */
export interface BorrowBookInput {
  userId: UserId; // Value object (validated 8-digit user ID)
  bookId: string; // Book UUID (could also be a BookId value object)
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
   * FIXED: Now receives validated value objects directly
   *
   * @param input - Borrow book input data (with value objects)
   * @returns Borrowing result with DTOs
   */
  async execute(input: BorrowBookInput): Promise<BorrowBookOutput> {
    // Step 1: Find user by ID (application concern - entity retrieval)
    // No need to convert - already a UserId value object!
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return {
        success: false,
        message: `User not found: ${input.userId.getValue()}`,
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
 *
 * UPDATED (Lesson 3 - Fixed):
 * - Uses value objects instead of primitive strings
 * - Validation happens at application boundary
 */
export interface ReturnBookInput {
  userId: UserId; // Value object (validated 8-digit user ID)
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
   * FIXED: Now receives validated value objects directly
   *
   * @param input - Return book input data (with value objects)
   * @returns Return result with DTOs and overdue fee info
   */
  async execute(input: ReturnBookInput): Promise<ReturnBookOutput> {
    // Find user - no need to convert, already a UserId value object!
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return {
        success: false,
        message: `User not found: ${input.userId.getValue()}`,
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
