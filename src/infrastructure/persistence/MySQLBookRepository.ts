/**
 * MySQL Book Repository Implementation
 *
 * Concrete implementation of IBookRepository using MySQL (via Prisma).
 * This class belongs to the Infrastructure layer and implements
 * the interface defined in the Domain layer.
 */
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { Book, BookStatus } from '../../domain/entities/Book';
import { ISBN } from '../../domain/valueObjects/ISBN';
import { PrismaClient } from '@prisma/client';

export class MySQLBookRepository implements IBookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(book: Book): Promise<void> {
    await this.prisma.book.upsert({
      where: { id: book.id },
      update: {
        title: book.title,
        author: book.author,
        status: book.status,
        updatedAt: book.updatedAt,
      },
      create: {
        id: book.id,
        isbn: book.isbn.getValue(),
        title: book.title,
        author: book.author,
        status: book.status,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Book | null> {
    const record = await this.prisma.book.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findByISBN(isbn: ISBN): Promise<Book | null> {
    const record = await this.prisma.book.findUnique({
      where: { isbn: isbn.getValue() },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(): Promise<Book[]> {
    const records = await this.prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.book.delete({
      where: { id },
    });
  }

  async findByStatus(status: string): Promise<Book[]> {
    const records = await this.prisma.book.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  /**
   * Convert database record to domain entity
   * @private
   */
  private toDomain(record: {
    id: string;
    isbn: string;
    title: string;
    author: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Book {
    const isbnVO = new ISBN(record.isbn);
    const status = record.status as BookStatus;

    return Book.reconstruct(
      record.id,
      isbnVO,
      record.title,
      record.author,
      status,
      record.createdAt,
      record.updatedAt
    );
  }
}
