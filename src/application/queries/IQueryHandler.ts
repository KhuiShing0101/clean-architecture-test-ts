/**
 * Query Handler Interface - Lesson 6
 *
 * Handles query execution and returns results.
 * Query handlers are responsible for fetching data efficiently.
 *
 * Characteristics:
 * - Read-only operations
 * - Can use optimized read models
 * - Can use caching
 * - Can use different data sources (read replicas, elasticsearch, etc.)
 * - Should be fast and scalable
 */

import { IQuery } from './IQuery';

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult> {
  /**
   * Execute the query and return results
   * @param query - The query to execute
   * @returns Query results
   */
  handle(query: TQuery): Promise<TResult>;
}
