/**
 * Query Interface - Lesson 6
 *
 * Base interface for all queries (read operations).
 * Queries return data without modifying state.
 *
 * CQRS Pattern:
 * - Commands: Change state (write)
 * - Queries: Read state (read)
 *
 * Key Principles:
 * - Queries never modify state
 * - Can be optimized independently from commands
 * - Can use different data models (denormalized for performance)
 * - Can use different storage (read replicas, caches, etc.)
 */

export interface IQuery<TResult> {
  // Marker interface - queries are just data containers
}
