/**
 * User Repository Interface
 *
 * Defines the contract for user data access.
 * This interface belongs to the Domain layer and keeps the domain
 * independent of infrastructure concerns.
 *
 * Implementations of this interface will be in the Infrastructure layer.
 */

import { User } from '../entities/User';
import { UserId } from '../valueObjects/UserId';

export interface IUserRepository {
  /**
   * Save a user (insert or update)
   * @param user - User entity to save
   */
  save(user: User): Promise<void>;

  /**
   * Find a user by their ID
   * @param id - UserId value object
   * @returns User if found, null otherwise
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find a user by email address
   * Domain-specific query method for duplicate email checking
   *
   * @param email - Email address to search for
   * @returns User if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users
   * @returns Array of all users
   */
  findAll(): Promise<User[]>;

  /**
   * Delete a user by ID
   * @param id - UserId value object
   */
  delete(id: UserId): Promise<void>;

  /**
   * Find users with overdue fees
   * Domain-specific query for business logic
   *
   * @returns Array of users who have overdue fees > 0
   */
  findUsersWithOverdueFees(): Promise<User[]>;
}
