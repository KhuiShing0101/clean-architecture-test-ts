/**
 * Prisma User Repository Implementation
 *
 * Concrete implementation of IUserRepository using Prisma ORM.
 * This class belongs to the Infrastructure layer and implements
 * the interface defined in the Domain layer.
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserStatus } from '../../domain/entities/User';
import { UserId } from '../../domain/valueObjects/UserId';
import { PrismaClient } from '@prisma/client';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id.getValue() },
      update: {
        name: user.name,
        email: user.email,
        status: user.status,
        currentBorrowCount: user.currentBorrowCount,
        overdueFees: user.overdueFees,
      },
      create: {
        id: user.id.getValue(),
        name: user.name,
        email: user.email,
        status: user.status,
        currentBorrowCount: user.currentBorrowCount,
        overdueFees: user.overdueFees,
        createdAt: user.createdAt,
      },
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: id.getValue() },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id: id.getValue() },
    });
  }

  async findUsersWithOverdueFees(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        overdueFees: {
          gt: 0,
        },
      },
      orderBy: { overdueFees: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  /**
   * Convert database record to domain entity
   * @private
   */
  private toDomain(record: {
    id: string;
    name: string;
    email: string;
    status: string;
    currentBorrowCount: number;
    overdueFees: number;
    createdAt: Date;
  }): User {
    const userId = UserId.create(record.id);
    const status = record.status as UserStatus;

    return User.reconstruct(
      userId,
      record.name,
      record.email,
      status,
      record.currentBorrowCount,
      record.overdueFees,
      record.createdAt
    );
  }
}
