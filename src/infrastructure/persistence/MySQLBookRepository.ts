/**
 * MySQL Book Repository Implementation - Enhanced for Lesson 3
 *
 * Handles borrowedBy and borrowedAt fields for multi-entity operations
 */
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { Book, BookStatus } from '../../domain/entities/Book';
import { ISBN } from '../../domain/valueObjects/ISBN';
import { UserId } from '../../domain/valueObjects/UserId';
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
        borrowedBy: book.borrowedBy?.getValue() ?? null,
        borrowedAt: book.borrowedAt,
        updatedAt: book.updatedAt,
      },
      create: {
        id: book.id,
        isbn: book.isbn.getValue(),
        title: book.title,
        author: book.author,
        status: book.status,
        borrowedBy: book.borrowedBy?.getValue() ?? null,
        borrowedAt: book.borrowedAt,
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

  private toDomain(record: {
    id: string;
    isbn: string;
    title: string;
    author: string;
    status: string;
    borrowedBy: string | null;
    borrowedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Book {
    const isbnVO = new ISBN(record.isbn);
    const status = record.status as BookStatus;
    const borrowedBy = record.borrowedBy ? UserId.create(record.borrowedBy) : null;

    return Book.reconstruct(
      record.id,
      isbnVO,
      record.title,
      record.author,
      status,
      borrowedBy,
      record.borrowedAt,
      record.createdAt,
      record.updatedAt
    );
  }
}
