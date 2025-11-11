/**
 * Register Book Use Case
 *
 * Application-specific business logic for registering a new book.
 * Orchestrates the book registration flow, ensuring business rules are followed.
 *
 * This use case:
 * 1. Validates input
 * 2. Checks for ISBN uniqueness
 * 3. Creates book entity
 * 4. Persists to repository
 * 5. Returns result DTO
 */
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { Book } from '../../domain/entities/Book';
import { ISBN } from '../../domain/valueObjects/ISBN';

/**
 * Input DTO for Register Book Use Case
 */
export interface RegisterBookInput {
  isbn: string;
  title: string;
  author: string;
}

/**
 * Output DTO for Register Book Use Case
 */
export interface RegisterBookOutput {
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  status: string;
  createdAt: Date;
}

/**
 * Register Book Use Case
 */
export class RegisterBookUseCase {
  constructor(private readonly bookRepository: IBookRepository) {}

  /**
   * Execute the use case
   * @param input - Book registration input data
   * @returns Registration result
   * @throws Error if ISBN already exists or validation fails
   */
  async execute(input: RegisterBookInput): Promise<RegisterBookOutput> {
    // Step 1: Validate ISBN format (will throw if invalid)
    const isbnVO = new ISBN(input.isbn);

    // Step 2: Check for ISBN uniqueness
    const existingBook = await this.bookRepository.findByISBN(isbnVO);

    if (existingBook) {
      throw new Error(
        `Book with ISBN ${input.isbn} already exists (ID: ${existingBook.id})`
      );
    }

    // Step 3: Create book entity (factory method handles validation)
    const book = Book.create(input.isbn, input.title, input.author);

    // Step 4: Persist to repository
    await this.bookRepository.save(book);

    // Step 5: Return output DTO
    return {
      bookId: book.id,
      isbn: book.isbn.getValue(),
      title: book.title,
      author: book.author,
      status: book.status,
      createdAt: book.createdAt,
    };
  }
}
