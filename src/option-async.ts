import { Option, OptionSome, OptionNone, Some, None, FlattenOption } from './option';

// ============================================================================
// Type Utilities
// ============================================================================

/** Type for functions that may be sync or async */
type MaybeAsync<T> = T | Promise<T>;

/** Type for Option that may be wrapped in Promise */
type MaybeAsyncOption<T> = MaybeAsync<Option<T>>;

// ============================================================================
// OptionAsync Class
// ============================================================================

/**
 * A wrapper around `Promise<Option<T>>` that enables fluent async chains.
 *
 * `OptionAsync` allows you to chain operations on async Options without
 * needing to await at each step. All transformations are lazily composed
 * and only executed when you await the final result.
 *
 * @typeParam T - The contained value type
 *
 * @example
 * ```typescript
 * const result = await OptionAsync.fromPromise(fetchUser(id))
 *     .map(user => user.profile)
 *     .andThen(profile => fetchAvatar(profile.avatarId))
 *     .unwrapOr(defaultAvatar);
 * ```
 */
export class OptionAsync<T> implements PromiseLike<Option<T>> {
    private constructor(private readonly promise: Promise<Option<T>>) {}

    // ========================================================================
    // Constructors
    // ========================================================================

    /**
     * Creates an OptionAsync from an existing Promise<Option<T>>.
     */
    static fromOption<T>(option: MaybeAsyncOption<T>): OptionAsync<T> {
        return new OptionAsync(Promise.resolve(option));
    }

    /**
     * Creates an OptionAsync containing the value.
     */
    static some<T>(value: T): OptionAsync<T> {
        return new OptionAsync(Promise.resolve(Some(value)));
    }

    /**
     * Creates an empty OptionAsync.
     */
    static none<T = never>(): OptionAsync<T> {
        return new OptionAsync(Promise.resolve(None<T>()));
    }

    /**
     * Wraps a Promise, converting resolution to Some and rejection to None.
     *
     * @example
     * ```typescript
     * const result = await OptionAsync.fromPromise(fetch('/api/data'));
     * ```
     */
    static fromPromise<T>(promise: Promise<T>): OptionAsync<T> {
        return new OptionAsync(
            promise
                .then((value) => Some(value))
                .catch(() => None<T>())
        );
    }

    /**
     * Creates an OptionAsync from a nullable value.
     */
    static fromNullable<T>(value: T | null | undefined): OptionAsync<NonNullable<T>> {
        if (value === null || value === undefined) {
            return OptionAsync.none();
        }
        return OptionAsync.some(value as NonNullable<T>);
    }

    /**
     * Wraps a function that may throw, executing it and capturing the result.
     *
     * @example
     * ```typescript
     * const result = await OptionAsync.try(async () => {
     *     const res = await fetch('/api');
     *     return res.json();
     * });
     * ```
     */
    static try<T>(fn: () => MaybeAsync<T>): OptionAsync<T> {
        return new OptionAsync(
            (async () => {
                try {
                    const value = await fn();
                    return Some(value);
                } catch {
                    return None<T>();
                }
            })()
        );
    }

    /**
     * Combines multiple OptionAsync values into a single OptionAsync containing an array.
     *
     * Returns None if any option is None.
     */
    static all<T extends readonly OptionAsync<any>[]>(
        options: T
    ): OptionAsync<{ [K in keyof T]: T[K] extends OptionAsync<infer U> ? U : never }> {
        return new OptionAsync(
            (async () => {
                const values: any[] = [];
                for (const optionAsync of options) {
                    const option = await optionAsync;
                    if (option.is_none()) {
                        return None() as any;
                    }
                    values.push(option.value);
                }
                return Some(values) as any;
            })()
        );
    }

    // ========================================================================
    // PromiseLike Implementation
    // ========================================================================

    /**
     * Implements PromiseLike so OptionAsync can be awaited directly.
     */
    then<TResult1 = Option<T>, TResult2 = never>(
        onfulfilled?: ((value: Option<T>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    /**
     * Returns the underlying Promise.
     */
    toPromise(): Promise<Option<T>> {
        return this.promise;
    }

    // ========================================================================
    // Type Checking
    // ========================================================================

    /**
     * Async version of is_some(). Resolves to true if the option is Some.
     */
    async isSome(): Promise<boolean> {
        const option = await this.promise;
        return option.is_some();
    }

    /**
     * Async version of is_none(). Resolves to true if the option is None.
     */
    async isNone(): Promise<boolean> {
        const option = await this.promise;
        return option.is_none();
    }

    // ========================================================================
    // Transformations
    // ========================================================================

    /**
     * Maps the Some value using a sync or async function.
     */
    map<U>(fn: (value: T) => MaybeAsync<U>): OptionAsync<U> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_some()) {
                    const newValue = await fn(option.value);
                    return Some(newValue);
                }
                return None<U>();
            })
        );
    }

    /**
     * Maps the Some value, returning a default if None.
     */
    async mapOr<U>(defaultValue: U, fn: (value: T) => MaybeAsync<U>): Promise<U> {
        const option = await this.promise;
        if (option.is_some()) {
            return fn(option.value);
        }
        return defaultValue;
    }

    /**
     * Maps the Some value, computing a default if None.
     */
    async mapOrElse<U>(
        defaultFn: () => MaybeAsync<U>,
        fn: (value: T) => MaybeAsync<U>
    ): Promise<U> {
        const option = await this.promise;
        if (option.is_some()) {
            return fn(option.value);
        }
        return defaultFn();
    }

    // ========================================================================
    // Chaining (Monadic Operations)
    // ========================================================================

    /**
     * Chains a function that returns an Option or OptionAsync.
     */
    andThen<U>(
        fn: (value: T) => MaybeAsync<Option<U>> | OptionAsync<U>
    ): OptionAsync<U> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_some()) {
                    const next = fn(option.value);
                    if (next instanceof OptionAsync) {
                        return next.promise;
                    }
                    return next;
                }
                return None<U>();
            })
        );
    }

    /**
     * Returns this if Some, otherwise evaluates the provided function.
     */
    orElse<U>(fn: () => MaybeAsync<Option<U>> | OptionAsync<U>): OptionAsync<T | U> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_none()) {
                    const next = fn();
                    if (next instanceof OptionAsync) {
                        return next.promise as Promise<Option<T | U>>;
                    }
                    return next as Option<T | U>;
                }
                return option as Option<T | U>;
            })
        );
    }

    /**
     * Returns the provided OptionAsync if this is Some, otherwise returns None.
     */
    and<U>(other: OptionAsync<U>): OptionAsync<U> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_some()) {
                    return other.promise;
                }
                return None<U>();
            })
        );
    }

    /**
     * Returns this if Some, otherwise returns the provided OptionAsync.
     */
    or<U>(other: OptionAsync<U>): OptionAsync<T | U> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_none()) {
                    return other.promise as Promise<Option<T | U>>;
                }
                return option as Option<T | U>;
            })
        );
    }

    // ========================================================================
    // Filtering
    // ========================================================================

    /**
     * Filters the Some value using a predicate.
     */
    filter(predicate: (value: T) => MaybeAsync<boolean>): OptionAsync<T> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_some()) {
                    const keep = await predicate(option.value);
                    if (keep) {
                        return option;
                    }
                }
                return None<T>();
            })
        );
    }

    // ========================================================================
    // Unwrapping
    // ========================================================================

    /**
     * Unwraps the Some value, or throws with the provided message.
     */
    async expect(msg: string): Promise<T> {
        const option = await this.promise;
        return option.expect(msg);
    }

    /**
     * Unwraps the Some value, or throws.
     */
    async unwrap(): Promise<T> {
        const option = await this.promise;
        return option.unwrap();
    }

    /**
     * Unwraps the Some value, or returns the provided default.
     */
    async unwrapOr(defaultValue: T): Promise<T> {
        const option = await this.promise;
        return option.unwrap_or(defaultValue);
    }

    /**
     * Unwraps the Some value, or computes a default.
     */
    async unwrapOrElse(fn: () => MaybeAsync<T>): Promise<T> {
        const option = await this.promise;
        if (option.is_some()) {
            return option.value;
        }
        return fn();
    }

    // ========================================================================
    // Inspection
    // ========================================================================

    /**
     * Calls the function with the Some value for side effects.
     */
    inspect(fn: (value: T) => void): OptionAsync<T> {
        return new OptionAsync(
            this.promise.then((option) => {
                if (option.is_some()) {
                    fn(option.value);
                }
                return option;
            })
        );
    }

    // ========================================================================
    // Conversion
    // ========================================================================

    /**
     * Flattens an OptionAsync<Option<U>> into OptionAsync<U>.
     */
    flatten<U>(this: OptionAsync<Option<U>>): OptionAsync<U> {
        return new OptionAsync(
            this.promise.then((option) => {
                if (option.is_some()) {
                    return option.value;
                }
                return None<U>();
            })
        );
    }

    /**
     * Zips this OptionAsync with another.
     */
    zip<U>(other: OptionAsync<U>): OptionAsync<[T, U]> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_some()) {
                    const otherOption = await other.promise;
                    if (otherOption.is_some()) {
                        return Some([option.value, otherOption.value] as [T, U]);
                    }
                }
                return None<[T, U]>();
            })
        );
    }

    /**
     * Zips with a function.
     */
    zipWith<U, R>(other: OptionAsync<U>, fn: (a: T, b: U) => MaybeAsync<R>): OptionAsync<R> {
        return new OptionAsync(
            this.promise.then(async (option) => {
                if (option.is_some()) {
                    const otherOption = await other.promise;
                    if (otherOption.is_some()) {
                        const result = await fn(option.value, otherOption.value);
                        return Some(result);
                    }
                }
                return None<R>();
            })
        );
    }

    // ========================================================================
    // Pattern Matching
    // ========================================================================

    /**
     * Pattern matches on the option, calling the appropriate handler.
     */
    async match<R>(handlers: {
        Some: (value: T) => MaybeAsync<R>;
        None: () => MaybeAsync<R>;
    }): Promise<R> {
        const option = await this.promise;
        if (option.is_some()) {
            return handlers.Some(option.value);
        }
        return handlers.None();
    }
}

// ============================================================================
// Extension: Add toAsync() method to Option
// ============================================================================

declare module './option' {
    interface OptionSome<T> {
        /**
         * Lifts this Option into an OptionAsync.
         */
        toAsync(): OptionAsync<T>;
    }

    interface OptionNone<T> {
        /**
         * Lifts this Option into an OptionAsync.
         */
        toAsync(): OptionAsync<T>;
    }
}

// Add toAsync to Option classes
OptionSome.prototype.toAsync = function <T>(this: OptionSome<T>): OptionAsync<T> {
    return OptionAsync.fromOption(this);
};

OptionNone.prototype.toAsync = function <T>(this: OptionNone<T>): OptionAsync<T> {
    return OptionAsync.fromOption(this);
};
