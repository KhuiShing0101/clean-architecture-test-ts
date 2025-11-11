/**
 * Create User Use Case
 *
 * Application-specific business logic for creating a new user.
 * Orchestrates the user creation flow, ensuring business rules are followed.
 *
 * This use case:
 * 1. Validates input
 * 2. Checks for email uniqueness
 * 3. Creates user entity
 * 4. Persists to repository
 * 5. Returns result DTO
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';

/**
 * Input DTO for Create User Use Case
 */
export interface CreateUserInput {
  name: string;
  email: string;
}

/**
 * Output DTO for Create User Use Case
 */
export interface CreateUserOutput {
  userId: string;
  name: string;
  email: string;
  status: string;
  currentBorrowCount: number;
  overdueFees: number;
  createdAt: Date;
}

/**
 * Create User Use Case
 */
export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute the use case
   * @param input - User creation input data
   * @returns User creation result
   * @throws Error if email already exists or validation fails
   */
  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    // Step 1: Check for email uniqueness (business rule)
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new Error(
        `User with email ${input.email} already exists (ID: ${existingUser.id.getValue()})`
      );
    }

    // Step 2: Create user entity (factory method handles validation)
    const user = User.create(input.name, input.email);

    // Step 3: Persist to repository
    await this.userRepository.save(user);

    // Step 4: Return output DTO
    return {
      userId: user.id.getValue(),
      name: user.name,
      email: user.email,
      status: user.status,
      currentBorrowCount: user.currentBorrowCount,
      overdueFees: user.overdueFees,
      createdAt: user.createdAt,
    };
  }
}
