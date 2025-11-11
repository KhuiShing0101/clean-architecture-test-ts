/**
 * Borrow Book Use Case - FIXED (Lesson 3)
 *
 * Application-level orchestration for borrowing books.
 * Coordinates between application concerns and domain logic.
 *
 * Application Layer Responsibilities:
 * - Find entities by ID (data retrieval)
 * - Validate entities exist
 * - Delegate to domain service (business logic)
 * - Persist changes (transaction management)
 * - Transform domain results to DTOs (data presentation)
 * - Handle application-level errors
 *
 * Domain Logic (delegated to BorrowBookService):
 * - Validate business rules (PURE LOGIC - no infrastructure!)
 * - Coordinate entity state changes
 * - Enforce domain invariants
 * - Return updated entities (NO PERSISTENCE!)
 *
 * ARCHITECTURAL FIXES:
 * ====================
 * Fix #1: Input DTOs receive VALUE OBJECTS (not primitive strings)
 * - Validation happens at application boundary
 * - Presentation layer converts strings to value objects
 *
 * Fix #2: Domain service injected as INTERFACE (Dependency Inversion)
 * - Use case depends on IBorrowBookService (not concrete class)
 * - Better testability and decoupling
 *
 * Fix #3: Domain service has NO INFRASTRUCTURE dependencies
 * - Domain service contains PURE business logic
 * - NO repositories in domain service
 * - Application layer handles persistence
 * - Clear separation: Domain = logic, Application = orchestration + persistence
 *
 * Benefits:
 * ✅ Domain layer independent of infrastructure
 * ✅ Better encapsulation and type safety
 * ✅ Easier testing (pure functions don't need mocks)
 * ✅ Follows Dependency Inversion Principle
 * ✅ Clear layer responsibilities
 *
 * Flow:
 * 1. HTTP Request: { userId: "12345678" } (string)
 * 2. Presentation Layer: Converts to UserId.create("12345678") (validates!)
 * 3. Application Layer: Receives UserId value object (already validated)
 * 4. Use Case: Finds entities, calls domain service, persists results
 * 5. Domain Service: Pure logic, returns updated entities
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
import { IBorrowBookService } from '../../domain/services/IBorrowBookService';
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
 *
 * FIXED: Now receives domain service via dependency injection
 */
export class BorrowBookUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository,
    private readonly borrowService: IBorrowBookService // ✅ Injected as interface!
  ) {
    // Service is injected - no instantiation here
    // Follows Dependency Inversion Principle
  }

  /**
   * Execute the borrow book use case
   *
   * Application Flow:
   * 1. Find entities (application concern - data retrieval)
   * 2. Execute domain service (pure domain logic)
   * 3. Persist changes (application concern - transaction boundary)
   * 4. Transform to DTO (application concern - data presentation)
   *
   * FIXED #3: Application layer now handles persistence
   * Domain service returns updated entities, use case persists them
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

    // Step 3: Execute domain service (PURE domain logic - no persistence!)
    const result = this.borrowService.execute(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error!,
      };
    }

    // Step 4: Persist changes (application concern - transaction boundary)
    // Domain service returned updated entities, now we persist them
    // In production: wrap in database transaction for atomicity
    await this.userRepository.save(result.updatedUser!);
    await this.bookRepository.save(result.updatedBook!);

    // Step 5: Transform domain entities to DTOs (application concern)
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
 *
 * FIXED: Now receives domain service via dependency injection
 */
export class ReturnBookUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository,
    private readonly borrowService: IBorrowBookService // ✅ Injected as interface!
  ) {
    // Service is injected - no instantiation here
  }

  /**
   * Execute the return book use case
   *
   * Application Flow:
   * 1. Find entities (application concern - data retrieval)
   * 2. Execute domain service (pure domain logic)
   * 3. Persist changes (application concern - transaction boundary)
   * 4. Transform to DTO (application concern - data presentation)
   *
   * FIXED #3: Application layer now handles persistence
   * Domain service returns updated entities, use case persists them
   *
   * @param input - Return book input data (with value objects)
   * @returns Return result with DTOs and overdue fee info
   */
  async execute(input: ReturnBookInput): Promise<ReturnBookOutput> {
    // Step 1: Find user - no need to convert, already a UserId value object!
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return {
        success: false,
        message: `User not found: ${input.userId.getValue()}`,
      };
    }

    // Step 2: Find book
    const book = await this.bookRepository.findById(input.bookId);

    if (!book) {
      return {
        success: false,
        message: `Book not found: ${input.bookId}`,
      };
    }

    // Calculate potential overdue fee before return (for display purposes)
    const wasOverdue = book.isOverdue();
    const overdueFee = wasOverdue
      ? book.getOverdueDays() * BorrowBookService.OVERDUE_FEE_PER_DAY
      : 0;

    // Step 3: Execute domain service (PURE domain logic - no persistence!)
    const result = this.borrowService.returnBook(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error!,
      };
    }

    // Step 4: Persist changes (application concern - transaction boundary)
    // Domain service returned updated entities, now we persist them
    // In production: wrap in database transaction for atomicity
    await this.userRepository.save(result.updatedUser!);
    await this.bookRepository.save(result.updatedBook!);

    // Step 5: Transform to DTOs (application concern)
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
