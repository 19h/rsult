import { Result, ResultOk, ResultErr, Ok, Err, FlattenResult } from './result';
import { Option, Some, None } from './option';

// ============================================================================
// Type Utilities
// ============================================================================

/** Unwrap the inner Result from a ResultAsync */
export type UnwrapResultAsync<R> = R extends ResultAsync<infer T, infer E>
    ? Result<T, E>
    : never;

/** Type for functions that may be sync or async */
type MaybeAsync<T> = T | Promise<T>;

/** Type for Result that may be wrapped in Promise */
type MaybeAsyncResult<T, E> = MaybeAsync<Result<T, E>>;

// ============================================================================
// ResultAsync Class
// ============================================================================

/**
 * A wrapper around `Promise<Result<T, E>>` that enables fluent async chains.
 *
 * `ResultAsync` allows you to chain operations on async Results without
 * needing to await at each step. All transformations are lazily composed
 * and only executed when you await the final result.
 *
 * @typeParam T - The success value type
 * @typeParam E - The error value type
 *
 * @example
 * ```typescript
 * const result = await ResultAsync.fromPromise(fetch('/api/user'))
 *     .andThen(res => ResultAsync.fromPromise(res.json()))
 *     .map(data => data.name)
 *     .mapErr(e => new ApiError(e.message));
 * ```
 */
export class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
    private constructor(private readonly promise: Promise<Result<T, E>>) {}

    // ========================================================================
    // Constructors
    // ========================================================================

    /**
     * Creates a ResultAsync from an existing Promise<Result<T, E>>.
     */
    static fromResult<T, E>(result: MaybeAsyncResult<T, E>): ResultAsync<T, E> {
        return new ResultAsync(Promise.resolve(result));
    }

    /**
     * Creates a successful ResultAsync containing the value.
     */
    static ok<T, E = never>(value: T): ResultAsync<T, E> {
        return new ResultAsync(Promise.resolve(Ok(value) as Result<T, E>));
    }

    /**
     * Creates a failed ResultAsync containing the error.
     */
    static err<T = never, E = unknown>(error: E): ResultAsync<T, E> {
        return new ResultAsync(Promise.resolve(Err(error) as Result<T, E>));
    }

    /**
     * Wraps a Promise, converting resolution to Ok and rejection to Err.
     *
     * @param promise - The promise to wrap
     * @param errorFn - Optional function to transform the caught error
     *
     * @example
     * ```typescript
     * const result = await ResultAsync.fromPromise(
     *     fetch('/api/data'),
     *     (e) => new NetworkError(e)
     * );
     * ```
     */
    static fromPromise<T, E = Error>(
        promise: Promise<T>,
        errorFn?: (error: unknown) => E
    ): ResultAsync<T, E> {
        return new ResultAsync(
            promise
                .then((value) => Ok(value) as Result<T, E>)
                .catch((error) => {
                    const mappedError = errorFn ? errorFn(error) : (error as E);
                    return Err(mappedError) as Result<T, E>;
                })
        );
    }

    /**
     * Wraps a function that may throw, executing it and capturing the result.
     *
     * Supports both sync and async functions.
     *
     * @example
     * ```typescript
     * const result = await ResultAsync.try(() => JSON.parse(jsonString));
     * const asyncResult = await ResultAsync.try(async () => {
     *     const res = await fetch('/api');
     *     return res.json();
     * });
     * ```
     */
    static try<T, E = Error>(
        fn: () => MaybeAsync<T>,
        errorFn?: (error: unknown) => E
    ): ResultAsync<T, E> {
        return new ResultAsync(
            (async () => {
                try {
                    const value = await fn();
                    return Ok(value) as Result<T, E>;
                } catch (error) {
                    const mappedError = errorFn ? errorFn(error) : (error as E);
                    return Err(mappedError) as Result<T, E>;
                }
            })()
        );
    }

    /**
     * Combines multiple ResultAsync values into a single ResultAsync containing an array.
     *
     * Short-circuits on the first error encountered.
     *
     * @example
     * ```typescript
     * const results = await ResultAsync.all([
     *     ResultAsync.fromPromise(fetch('/api/a')),
     *     ResultAsync.fromPromise(fetch('/api/b')),
     *     ResultAsync.fromPromise(fetch('/api/c')),
     * ]);
     * // Result<[Response, Response, Response], Error>
     * ```
     */
    static all<T extends readonly ResultAsync<any, any>[]>(
        results: T
    ): ResultAsync<
        { [K in keyof T]: T[K] extends ResultAsync<infer U, any> ? U : never },
        { [K in keyof T]: T[K] extends ResultAsync<any, infer E> ? E : never }[number]
    > {
        return new ResultAsync(
            (async () => {
                const values: any[] = [];
                for (const resultAsync of results) {
                    const result = await resultAsync;
                    if (result.is_err()) {
                        return result as any;
                    }
                    values.push(result.value);
                }
                return Ok(values) as any;
            })()
        );
    }

    /**
     * Combines multiple ResultAsync values, collecting all errors if any fail.
     *
     * Unlike `all`, this doesn't short-circuit and will collect all errors.
     *
     * @example
     * ```typescript
     * const results = await ResultAsync.allSettled([
     *     ResultAsync.fromPromise(fetch('/api/a')),
     *     ResultAsync.fromPromise(fetch('/api/b')),
     * ]);
     * // Result<[Response, Response], Error[]>
     * ```
     */
    static allSettled<T extends readonly ResultAsync<any, any>[]>(
        results: T
    ): ResultAsync<
        { [K in keyof T]: T[K] extends ResultAsync<infer U, any> ? U : never },
        Array<{ [K in keyof T]: T[K] extends ResultAsync<any, infer E> ? E : never }[number]>
    > {
        return new ResultAsync(
            (async () => {
                const values: any[] = [];
                const errors: any[] = [];

                for (const resultAsync of results) {
                    const result = await resultAsync;
                    if (result.is_err()) {
                        errors.push(result.value);
                    } else {
                        values.push(result.value);
                    }
                }

                if (errors.length > 0) {
                    return Err(errors) as any;
                }
                return Ok(values) as any;
            })()
        );
    }

    // ========================================================================
    // PromiseLike Implementation
    // ========================================================================

    /**
     * Implements PromiseLike so ResultAsync can be awaited directly.
     */
    then<TResult1 = Result<T, E>, TResult2 = never>(
        onfulfilled?: ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    /**
     * Returns the underlying Promise.
     */
    toPromise(): Promise<Result<T, E>> {
        return this.promise;
    }

    // ========================================================================
    // Type Checking
    // ========================================================================

    /**
     * Async version of is_ok(). Resolves to true if the result is Ok.
     */
    async isOk(): Promise<boolean> {
        const result = await this.promise;
        return result.is_ok();
    }

    /**
     * Async version of is_err(). Resolves to true if the result is Err.
     */
    async isErr(): Promise<boolean> {
        const result = await this.promise;
        return result.is_err();
    }

    // ========================================================================
    // Transformations
    // ========================================================================

    /**
     * Maps the Ok value using a sync or async function.
     *
     * @example
     * ```typescript
     * const result = ResultAsync.ok(5)
     *     .map(x => x * 2)
     *     .map(async x => x + 1);
     * ```
     */
    map<U>(fn: (value: T) => MaybeAsync<U>): ResultAsync<U, E> {
        return new ResultAsync(
            this.promise.then(async (result) => {
                if (result.is_ok()) {
                    const newValue = await fn(result.value);
                    return Ok(newValue) as Result<U, E>;
                }
                return Err(result.value) as Result<U, E>;
            })
        );
    }

    /**
     * Maps the Err value using a sync or async function.
     *
     * @example
     * ```typescript
     * const result = ResultAsync.err(new Error('fail'))
     *     .mapErr(e => new CustomError(e.message));
     * ```
     */
    mapErr<F>(fn: (error: E) => MaybeAsync<F>): ResultAsync<T, F> {
        return new ResultAsync(
            this.promise.then(async (result) => {
                if (result.is_err()) {
                    const newError = await fn(result.value);
                    return Err(newError) as Result<T, F>;
                }
                return Ok(result.value) as Result<T, F>;
            })
        );
    }

    /**
     * Maps the Ok value, returning a default if Err.
     */
    async mapOr<U>(defaultValue: U, fn: (value: T) => MaybeAsync<U>): Promise<U> {
        const result = await this.promise;
        if (result.is_ok()) {
            return fn(result.value);
        }
        return defaultValue;
    }

    /**
     * Maps the Ok value, computing a default from the error if Err.
     */
    async mapOrElse<U>(
        defaultFn: (error: E) => MaybeAsync<U>,
        fn: (value: T) => MaybeAsync<U>
    ): Promise<U> {
        const result = await this.promise;
        if (result.is_ok()) {
            return fn(result.value);
        }
        return defaultFn(result.value);
    }

    // ========================================================================
    // Chaining (Monadic Operations)
    // ========================================================================

    /**
     * Chains a function that returns a Result or ResultAsync.
     *
     * This is the monadic bind (flatMap) operation for async Results.
     *
     * @example
     * ```typescript
     * const result = ResultAsync.ok(userId)
     *     .andThen(id => fetchUser(id))  // Returns ResultAsync
     *     .andThen(user => validateUser(user));  // Returns Result
     * ```
     */
    andThen<U>(
        fn: (value: T) => MaybeAsync<Result<U, E>> | ResultAsync<U, E>
    ): ResultAsync<U, E> {
        return new ResultAsync(
            this.promise.then(async (result) => {
                if (result.is_ok()) {
                    const next = fn(result.value);
                    if (next instanceof ResultAsync) {
                        return next.promise;
                    }
                    return next;
                }
                return Err(result.value) as Result<U, E>;
            })
        );
    }

    /**
     * Chains a function that returns a Result or ResultAsync on error.
     *
     * Used for error recovery.
     *
     * @example
     * ```typescript
     * const result = fetchFromPrimary()
     *     .orElse(err => fetchFromBackup())
     *     .orElse(err => ResultAsync.ok(defaultValue));
     * ```
     */
    orElse<F>(
        fn: (error: E) => MaybeAsync<Result<T, F>> | ResultAsync<T, F>
    ): ResultAsync<T, F> {
        return new ResultAsync(
            this.promise.then(async (result) => {
                if (result.is_err()) {
                    const next = fn(result.value);
                    if (next instanceof ResultAsync) {
                        return next.promise;
                    }
                    return next;
                }
                return Ok(result.value) as Result<T, F>;
            })
        );
    }

    /**
     * Returns the provided ResultAsync if this is Ok, otherwise returns this Err.
     */
    and<U>(other: ResultAsync<U, E>): ResultAsync<U, E> {
        return new ResultAsync(
            this.promise.then(async (result) => {
                if (result.is_ok()) {
                    return other.promise;
                }
                return Err(result.value) as Result<U, E>;
            })
        );
    }

    /**
     * Returns this if Ok, otherwise returns the provided ResultAsync.
     */
    or<F>(other: ResultAsync<T, F>): ResultAsync<T, F> {
        return new ResultAsync(
            this.promise.then(async (result) => {
                if (result.is_err()) {
                    return other.promise;
                }
                return Ok(result.value) as Result<T, F>;
            })
        );
    }

    // ========================================================================
    // Unwrapping
    // ========================================================================

    /**
     * Unwraps the Ok value, or throws with the provided message.
     */
    async expect(msg: string): Promise<T> {
        const result = await this.promise;
        return result.expect(msg);
    }

    /**
     * Unwraps the Ok value, or throws.
     */
    async unwrap(): Promise<T> {
        const result = await this.promise;
        return result.unwrap();
    }

    /**
     * Unwraps the Err value, or throws with the provided message.
     */
    async expectErr(msg: string): Promise<E> {
        const result = await this.promise;
        return result.expect_err(msg);
    }

    /**
     * Unwraps the Err value, or throws.
     */
    async unwrapErr(): Promise<E> {
        const result = await this.promise;
        return result.unwrap_err();
    }

    /**
     * Unwraps the Ok value, or returns the provided default.
     */
    async unwrapOr(defaultValue: T): Promise<T> {
        const result = await this.promise;
        return result.unwrap_or(defaultValue);
    }

    /**
     * Unwraps the Ok value, or computes a default from the error.
     */
    async unwrapOrElse(fn: (error: E) => MaybeAsync<T>): Promise<T> {
        const result = await this.promise;
        if (result.is_ok()) {
            return result.value;
        }
        return fn(result.value);
    }

    // ========================================================================
    // Inspection
    // ========================================================================

    /**
     * Calls the function with the Ok value for side effects.
     */
    inspect(fn: (value: T) => void): ResultAsync<T, E> {
        return new ResultAsync(
            this.promise.then((result) => {
                if (result.is_ok()) {
                    fn(result.value);
                }
                return result;
            })
        );
    }

    /**
     * Calls the function with the Err value for side effects.
     */
    inspectErr(fn: (error: E) => void): ResultAsync<T, E> {
        return new ResultAsync(
            this.promise.then((result) => {
                if (result.is_err()) {
                    fn(result.value);
                }
                return result;
            })
        );
    }

    // ========================================================================
    // Conversion
    // ========================================================================

    /**
     * Converts to Option<T>, discarding the error.
     */
    async ok(): Promise<Option<T>> {
        const result = await this.promise;
        return result.ok();
    }

    /**
     * Converts to Option<E>, discarding the value.
     */
    async err(): Promise<Option<E>> {
        const result = await this.promise;
        return result.err();
    }

    /**
     * Flattens a ResultAsync<Result<U, E>, E> into ResultAsync<U, E>.
     */
    flatten<U>(this: ResultAsync<Result<U, E>, E>): ResultAsync<U, E> {
        return new ResultAsync(
            this.promise.then((result) => {
                if (result.is_ok()) {
                    return result.value;
                }
                return Err(result.value) as Result<U, E>;
            })
        );
    }

    // ========================================================================
    // Pattern Matching
    // ========================================================================

    /**
     * Pattern matches on the result, calling the appropriate handler.
     *
     * @example
     * ```typescript
     * const message = await result.match({
     *     Ok: (value) => `Success: ${value}`,
     *     Err: (error) => `Failed: ${error.message}`,
     * });
     * ```
     */
    async match<R>(handlers: {
        Ok: (value: T) => MaybeAsync<R>;
        Err: (error: E) => MaybeAsync<R>;
    }): Promise<R> {
        const result = await this.promise;
        if (result.is_ok()) {
            return handlers.Ok(result.value);
        }
        return handlers.Err(result.value);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wraps an async function to return ResultAsync instead of throwing.
 *
 * @example
 * ```typescript
 * const safeFetch = tryAsync(fetch);
 * const result = await safeFetch('/api/data');
 * // ResultAsync<Response, Error>
 * ```
 */
export function tryAsync<Args extends any[], T, E = Error>(
    fn: (...args: Args) => Promise<T>,
    errorFn?: (error: unknown) => E
): (...args: Args) => ResultAsync<T, E> {
    return (...args: Args) => ResultAsync.try(() => fn(...args), errorFn);
}

/**
 * Converts a sync Result-returning function to return ResultAsync.
 *
 * @example
 * ```typescript
 * const parseJson = (s: string): Result<unknown, Error> => { ... };
 * const parseJsonAsync = liftAsync(parseJson);
 * const result = await parseJsonAsync(jsonString);
 * ```
 */
export function liftAsync<Args extends any[], T, E>(
    fn: (...args: Args) => Result<T, E>
): (...args: Args) => ResultAsync<T, E> {
    return (...args: Args) => ResultAsync.fromResult(fn(...args));
}

/**
 * Runs multiple ResultAsync operations in parallel and collects results.
 *
 * Alias for ResultAsync.all with better ergonomics for inline use.
 */
export const allAsync = ResultAsync.all.bind(ResultAsync);

/**
 * Converts a Promise to a ResultAsync.
 *
 * Alias for ResultAsync.fromPromise.
 */
export const fromPromise = ResultAsync.fromPromise.bind(ResultAsync);

// ============================================================================
// Extension: Add toAsync() method to Result
// ============================================================================

declare module './result' {
    interface ResultOk<T, E> {
        /**
         * Lifts this Result into a ResultAsync.
         */
        toAsync(): ResultAsync<T, E>;
    }

    interface ResultErr<T, E> {
        /**
         * Lifts this Result into a ResultAsync.
         */
        toAsync(): ResultAsync<T, E>;
    }
}

// Add toAsync to Result classes
ResultOk.prototype.toAsync = function <T, E>(this: ResultOk<T, E>): ResultAsync<T, E> {
    return ResultAsync.fromResult(this);
};

ResultErr.prototype.toAsync = function <T, E>(this: ResultErr<T, E>): ResultAsync<T, E> {
    return ResultAsync.fromResult(this);
};
