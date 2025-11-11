/**
 * Book Repository Interface
 *
 * Defines the contract for book data access.
 * This interface belongs to the Domain layer and keeps the domain
 * independent of infrastructure concerns.
 *
 * Implementations of this interface will be in the Infrastructure layer.
 */
import { Book } from '../entities/Book';
import { ISBN } from '../valueObjects/ISBN';

export interface IBookRepository {
  /**
   * Save a book (insert or update)
   * @param book - Book entity to save
   */
  save(book: Book): Promise<void>;

  /**
   * Find a book by its ID
   * @param id - Unique identifier
   * @returns Book if found, null otherwise
   */
  findById(id: string): Promise<Book | null>;

  /**
   * Find a book by ISBN
   * @param isbn - ISBN value object
   * @returns Book if found, null otherwise
   */
  findByISBN(isbn: ISBN): Promise<Book | null>;

  /**
   * Find all books
   * @returns Array of all books
   */
  findAll(): Promise<Book[]>;

  /**
   * Delete a book by ID
   * @param id - Unique identifier
   */
  delete(id: string): Promise<void>;

  /**
   * Find books by status
   * @param status - Book status to filter by
   * @returns Array of books with the given status
   */
  findByStatus(status: string): Promise<Book[]>;
}
