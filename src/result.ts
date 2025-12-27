import { Option, None, Some } from './option';

// ============================================================================
// Type-Level Utilities
// ============================================================================

/** Unique brand symbols for nominal typing */
declare const OkBrand: unique symbol;
declare const ErrBrand: unique symbol;

/** Extract the Ok type from a Result */
export type UnwrapOk<R> = R extends Result<infer T, any> ? T : never;

/** Extract the Err type from a Result */
export type UnwrapErr<R> = R extends Result<any, infer E> ? E : never;

/** Unwrap nested Result types for flatten() */
export type FlattenResult<T, E> = T extends Result<infer U, infer E2>
    ? Result<U, E | E2>
    : Result<T, E>;

/** Type-level check for nested Results */
export type IsNestedResult<T> = T extends Result<any, any> ? true : false;

// ============================================================================
// Result Type Definition
// ============================================================================

/**
 * A discriminated union representing either success (Ok) or failure (Err).
 *
 * @typeParam T - The success value type
 * @typeParam E - The error value type
 */
export type Result<T, E> = ResultOk<T, E> | ResultErr<T, E>;

// ============================================================================
// Core Interfaces
// ============================================================================

export interface IResultCore<T, E> {
    /**
     * Returns `true` if the result is `Ok`.
     *
     * This is a type guard that narrows the type to `ResultOk<T, E>`.
     */
    is_ok(): this is ResultOk<T, E>;

    /**
     * Returns `true` if the result is `Err`.
     *
     * This is a type guard that narrows the type to `ResultErr<T, E>`.
     */
    is_err(): this is ResultErr<T, E>;

    /**
     * Converts from `Result<T, E>` to `Option<T>`.
     *
     * Returns `Some(value)` if `Ok`, otherwise `None`.
     */
    ok(): Option<T>;

    /**
     * Converts from `Result<T, E>` to `Option<E>`.
     *
     * Returns `Some(error)` if `Err`, otherwise `None`.
     */
    err(): Option<E>;

    /**
     * Returns the contained `Ok` value, or throws with the provided message.
     *
     * @throws Error with `msg` if this is `Err`
     */
    expect(msg: string): T;

    /**
     * Returns the contained `Ok` value, or throws.
     *
     * @throws Error if this is `Err`
     */
    unwrap(): T;

    /**
     * Returns the contained `Err` value, or throws with the provided message.
     *
     * @throws Error with `msg` if this is `Ok`
     */
    expect_err(msg: string): E;

    /**
     * Returns the contained `Err` value, or throws.
     *
     * @throws Error if this is `Ok`
     */
    unwrap_err(): E;

    /**
     * Returns the contained `Ok` value. Identical to `unwrap()`.
     *
     * @throws Error if this is `Err`
     */
    into_ok(): T;

    /**
     * Returns the contained `Err` value. Identical to `unwrap_err()`.
     *
     * @throws Error if this is `Ok`
     */
    into_err(): E;
}

export interface IResultExt<T, E> extends IResultCore<T, E> {
    /**
     * Returns `true` if `Ok` and the value satisfies the predicate.
     */
    is_ok_and(f: (value: T) => boolean): boolean;

    /**
     * Returns `true` if `Err` and the error satisfies the predicate.
     */
    is_err_and(f: (value: E) => boolean): boolean;

    /**
     * Maps a `Result<T, E>` to `Result<U, E>` by applying `fn` to the `Ok` value.
     */
    map<U>(fn: (arg: T) => U): Result<U, E>;

    /**
     * Returns the provided default (if `Err`), or applies `fn` to the `Ok` value.
     */
    map_or<U>(defaultVal: U, f: (arg: T) => U): U;

    /**
     * Computes a default (if `Err`), or applies `fn` to the `Ok` value.
     */
    map_or_else<U>(defaultFunc: (err: E) => U, f: (arg: T) => U): U;

    /**
     * Maps a `Result<T, E>` to `Result<T, U>` by applying `fn` to the `Err` value.
     */
    map_err<U>(fn: (arg: E) => U): Result<T, U>;

    /**
     * Calls `fn` with the `Ok` value if present, then returns the original result.
     */
    inspect(f: (val: T) => void): this;

    /**
     * Calls `fn` with the `Err` value if present, then returns the original result.
     */
    inspect_err(f: (val: E) => void): this;

    /**
     * Returns `res` if `Ok`, otherwise returns the `Err` value of `self`.
     */
    and<U>(res: Result<U, E>): Result<U, E>;

    /**
     * Calls `fn` if `Ok`, otherwise returns the `Err` value of `self`.
     * This is the monadic bind operation (flatMap).
     */
    and_then<U>(fn: (arg: T) => Result<U, E>): Result<U, E>;

    /**
     * Returns `res` if `Err`, otherwise returns the `Ok` value of `self`.
     */
    or<F>(res: Result<T, F>): Result<T, F>;

    /**
     * Calls `fn` if `Err`, otherwise returns the `Ok` value of `self`.
     */
    or_else<F>(fn: (arg: E) => Result<T, F>): Result<T, F>;

    /**
     * Returns the contained `Ok` value or the provided default.
     */
    unwrap_or(defaultVal: T): T;

    /**
     * Returns the contained `Ok` value or computes it from `fn`.
     */
    unwrap_or_else(fn: (arg: E) => T): T;
}

export interface IResultIteration<T, E> extends IResultCore<T, E> {
    /**
     * Returns an iterator over the possibly contained `Ok` value.
     * Yields one element if `Ok`, zero if `Err`.
     */
    iter(): IterableIterator<T>;

    /**
     * Flattens a `Result<Result<U, E2>, E>` into `Result<U, E | E2>`.
     *
     * If `T` is not a `Result`, returns `Result<T, E>` unchanged.
     */
    flatten(): FlattenResult<T, E>;

    /**
     * Transposes a `Result` of an `Option` into an `Option` of a `Result`.
     *
     * - `Ok(None)` → `None`
     * - `Ok(Some(v))` → `Some(Ok(v))`
     * - `Err(e)` → `Some(Err(e))`
     *
     * @example
     * ```typescript
     * Ok(Some(5)).transpose()   // Some(Ok(5))
     * Ok(None()).transpose()    // None
     * Err("e").transpose()      // Some(Err("e"))
     * ```
     */
    transpose(): T extends { _tag: 'Some'; value: infer U }
        ? { _tag: 'Some'; value: Result<U, E> }
        : T extends { _tag: 'None' }
        ? { _tag: 'None' }
        : { _tag: 'Some' | 'None'; value?: Result<unknown, E> };
}

/**
 * Methods specific to `ResultOk` that provide more precise types.
 */
export interface IResultOkSpecific<T, E> {
    /**
     * Type-safe transmute that narrows the error type to `never`.
     *
     * Since this is `Ok`, there's no error, so `E` can safely become `never`.
     */
    transmute(): ResultOk<T, never>;
}

/**
 * Methods specific to `ResultErr` that provide more precise types.
 */
export interface IResultErrSpecific<T, E> {
    /**
     * Type-safe transmute that narrows the value type to `never`.
     *
     * Since this is `Err`, there's no value, so `T` can safely become `never`.
     */
    transmute(): ResultErr<never, E>;
}

export interface IResult<T, E> extends
    IResultCore<T, E>,
    IResultExt<T, E>,
    IResultIteration<T, E> {
    /**
     * Converts between different Result types by narrowing phantom types.
     *
     * - On `Ok<T, E>`: returns `Ok<T, never>` (error type becomes `never`)
     * - On `Err<T, E>`: returns `Err<never, E>` (value type becomes `never`)
     */
    transmute(): ResultOk<T, never> | ResultErr<never, E>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is `ResultOk`.
 */
export const isResultOk = <T, E>(val: Result<T, E>): val is ResultOk<T, E> => {
    return val instanceof ResultOk;
};

/**
 * Type guard to check if a value is `ResultErr`.
 */
export const isResultErr = <T, E>(val: Result<T, E>): val is ResultErr<T, E> => {
    return val instanceof ResultErr;
};

// ============================================================================
// ResultOk Implementation
// ============================================================================

/**
 * The `Ok` variant of `Result<T, E>`, representing success with a value of type `T`.
 *
 * Uses branded typing for nominal type safety.
 *
 * @typeParam T - The success value type
 * @typeParam E - The error type (phantom - not used at runtime in Ok)
 */
export class ResultOk<out T, out E = never> implements IResult<T, E>, IResultOkSpecific<T, E> {
    /** Brand for nominal typing - ensures ResultOk is distinct from ResultErr */
    declare readonly [OkBrand]: T;

    /** Discriminant tag for runtime type checking */
    readonly _tag = 'Ok' as const;

    constructor(readonly value: T) {}

    // Type guards
    is_ok(): this is ResultOk<T, E> {
        return true;
    }

    is_err(): this is ResultErr<T, E> {
        return false;
    }

    is_ok_and(f: (value: T) => boolean): boolean {
        return f(this.value);
    }

    is_err_and(_f: (value: E) => boolean): false {
        return false;
    }

    // Conversion to Option
    ok(): Option<T> {
        return Some(this.value);
    }

    err(): Option<E> {
        return None();
    }

    // Transformations
    map<U>(fn: (arg: T) => U): ResultOk<U, E> {
        return new ResultOk(fn(this.value));
    }

    map_or<U>(_d: U, f: (arg: T) => U): U {
        return f(this.value);
    }

    map_or_else<U>(_d: (e: E) => U, f: (arg: T) => U): U {
        return f(this.value);
    }

    /**
     * On Ok, map_err is a no-op that changes only the error type parameter.
     * We construct a new ResultOk with the same value but updated type parameter.
     */
    map_err<U>(_fn: (arg: E) => U): ResultOk<T, U> {
        // Type-safe: we're Ok, so E is phantom. Creating new instance preserves type safety.
        return new ResultOk<T, U>(this.value);
    }

    // Inspection
    inspect(f: (val: T) => void): this {
        f(this.value);
        return this;
    }

    inspect_err(_f: (val: E) => void): this {
        return this;
    }

    // Iteration
    iter(): IterableIterator<T> {
        return [this.value][Symbol.iterator]();
    }

    // Unwrapping
    expect(_msg: string): T {
        return this.value;
    }

    unwrap(): T {
        return this.value;
    }

    expect_err(msg: string): never {
        throw new Error(msg);
    }

    unwrap_err(): never {
        throw new Error('Called Result.unwrap_err() on an Ok value: ' + this.value);
    }

    // Combinators
    and<U>(res: Result<U, E>): Result<U, E> {
        return res;
    }

    and_then<U>(fn: (arg: T) => Result<U, E>): Result<U, E> {
        return fn(this.value);
    }

    /**
     * On Ok, `or` returns self. We construct a new ResultOk with updated error type.
     */
    or<F>(_res: Result<T, F>): ResultOk<T, F> {
        return new ResultOk<T, F>(this.value);
    }

    /**
     * On Ok, `or_else` returns self. We construct a new ResultOk with updated error type.
     */
    or_else<F>(_fn: (arg: E) => Result<T, F>): ResultOk<T, F> {
        return new ResultOk<T, F>(this.value);
    }

    // Default values
    unwrap_or(_optb: T): T {
        return this.value;
    }

    unwrap_or_else(_fn: (arg: E) => T): T {
        return this.value;
    }

    // Flattening
    flatten(): FlattenResult<T, E> {
        const val = this.value;
        if (val instanceof ResultOk || val instanceof ResultErr) {
            return val as FlattenResult<T, E>;
        }
        return this as unknown as FlattenResult<T, E>;
    }

    // Type narrowing
    into_ok(): T {
        return this.value;
    }

    into_err(): never {
        throw new Error('Called Result.into_err() on an Ok value: ' + this.value);
    }

    /**
     * Transmutes to Ok<T, never>, proving there's no error.
     */
    transmute(): ResultOk<T, never> {
        return new ResultOk<T, never>(this.value);
    }

    /**
     * Transposes Ok(Option<U>) into Option<Result<U, E>>.
     */
    transpose(): any {
        const option = this.value as { _tag: 'Some' | 'None'; value?: unknown; is_some?(): boolean };
        if (option._tag === 'Some' || (option.is_some && option.is_some())) {
            return Some(new ResultOk(option.value));
        } else {
            return None();
        }
    }
}

// ============================================================================
// ResultErr Implementation
// ============================================================================

/**
 * The `Err` variant of `Result<T, E>`, representing failure with an error of type `E`.
 *
 * Uses branded typing for nominal type safety.
 *
 * @typeParam T - The success type (phantom - not used at runtime in Err)
 * @typeParam E - The error value type
 */
export class ResultErr<out T = never, out E = unknown> implements IResult<T, E>, IResultErrSpecific<T, E> {
    /** Brand for nominal typing - ensures ResultErr is distinct from ResultOk */
    declare readonly [ErrBrand]: E;

    /** Discriminant tag for runtime type checking */
    readonly _tag = 'Err' as const;

    constructor(readonly value: E) {}

    // Type guards
    is_ok(): this is ResultOk<T, E> {
        return false;
    }

    is_err(): this is ResultErr<T, E> {
        return true;
    }

    is_ok_and(_f: (value: T) => boolean): false {
        return false;
    }

    is_err_and(f: (value: E) => boolean): boolean {
        return f(this.value);
    }

    // Conversion to Option
    ok(): Option<T> {
        return None();
    }

    err(): Option<E> {
        return Some(this.value);
    }

    // Transformations
    /**
     * On Err, map is a no-op that changes only the value type parameter.
     */
    map<U>(_fn: (arg: T) => U): ResultErr<U, E> {
        return new ResultErr<U, E>(this.value);
    }

    map_or<U>(d: U, _f: (arg: T) => U): U {
        return d;
    }

    map_or_else<U>(d: (e: E) => U, _f: (arg: T) => U): U {
        return d(this.value);
    }

    map_err<U>(fn: (arg: E) => U): ResultErr<T, U> {
        return new ResultErr(fn(this.value));
    }

    // Inspection
    inspect(_f: (val: T) => void): this {
        return this;
    }

    inspect_err(f: (val: E) => void): this {
        f(this.value);
        return this;
    }

    // Iteration
    iter(): IterableIterator<T> {
        return [][Symbol.iterator]();
    }

    // Unwrapping
    expect(msg: string): never {
        throw new Error(msg);
    }

    unwrap(): never {
        throw new Error('Called Result.unwrap() on an Err value: ' + this.value);
    }

    expect_err(_msg: string): E {
        return this.value;
    }

    unwrap_err(): E {
        return this.value;
    }

    // Combinators
    /**
     * On Err, `and` returns self. We construct a new ResultErr with updated value type.
     */
    and<U>(_res: Result<U, E>): ResultErr<U, E> {
        return new ResultErr<U, E>(this.value);
    }

    /**
     * On Err, `and_then` returns self. We construct a new ResultErr with updated value type.
     */
    and_then<U>(_fn: (arg: T) => Result<U, E>): ResultErr<U, E> {
        return new ResultErr<U, E>(this.value);
    }

    or<F>(res: Result<T, F>): Result<T, F> {
        return res;
    }

    or_else<F>(fn: (arg: E) => Result<T, F>): Result<T, F> {
        return fn(this.value);
    }

    // Default values
    unwrap_or(optb: T): T {
        return optb;
    }

    unwrap_or_else(fn: (arg: E) => T): T {
        return fn(this.value);
    }

    // Flattening
    flatten(): FlattenResult<T, E> {
        return new ResultErr<UnwrapOk<T>, E>(this.value) as FlattenResult<T, E>;
    }

    // Type narrowing
    into_ok(): never {
        throw new Error('Called Result.into_ok() on an Err value: ' + this.value);
    }

    into_err(): E {
        return this.value;
    }

    /**
     * Transmutes to Err<never, E>, proving there's no value.
     */
    transmute(): ResultErr<never, E> {
        return new ResultErr<never, E>(this.value);
    }

    /**
     * Transposes Err(e) into Some(Err(e)).
     * For Err, we always return Some(Err(e)) regardless of the expected Option type.
     */
    transpose(): any {
        return Some(new ResultErr(this.value));
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates an `Ok` result containing the given value.
 *
 * The error type defaults to `never`, indicating this Result cannot be an Err.
 * This enables type inference to work correctly in chains.
 *
 * @example
 * const result = Ok(42);  // Result<number, never>
 * const mapped = result.map(x => x * 2);  // Result<number, never>
 */
export const Ok = <T>(val: T): ResultOk<T, never> => {
    return new ResultOk<T, never>(val);
};

/**
 * Creates an `Err` result containing the given error.
 *
 * The value type defaults to `never`, indicating this Result cannot be Ok.
 * This enables type inference to work correctly in chains.
 *
 * @example
 * const result = Err(new Error("failed"));  // Result<never, Error>
 * const handled = result.or(Ok(0));  // Result<number, never>
 */
export const Err = <E>(val: E): ResultErr<never, E> => {
    return new ResultErr<never, E>(val);
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Executes a function and wraps its result in a `Result`.
 *
 * If the function succeeds, returns `Ok(value)`.
 * If it throws, returns `Err(error)`.
 *
 * @typeParam T - The return type of the function
 * @typeParam E - The error type (defaults to Error)
 *
 * @example
 * const result = try_catch(() => JSON.parse(jsonString));
 * // Result<unknown, Error>
 */
export const try_catch = <T, E = Error>(fn: () => T): Result<T, E> => {
    try {
        return Ok(fn()) as Result<T, E>;
    } catch (error: unknown) {
        return Err(error as E) as Result<T, E>;
    }
};

/**
 * Converts a Promise to a Result wrapped in a Promise.
 *
 * If the promise resolves, returns `Ok(value)`.
 * If it rejects, returns `Err(error)`.
 *
 * @typeParam T - The resolved value type
 * @typeParam E - The error type (defaults to Error)
 *
 * @example
 * const result = await result_from_promise(fetch('/api/data'));
 * // Result<Response, Error>
 */
export const result_from_promise = async <T, E = Error>(
    val: Promise<T>,
): Promise<Result<T, E>> => {
    try {
        return Ok(await val) as Result<T, E>;
    } catch (error: unknown) {
        return Err(error as E) as Result<T, E>;
    }
};

// ============================================================================
// Advanced Type Utilities
// ============================================================================

/**
 * Combines multiple Results into a single Result containing an array.
 *
 * If all Results are Ok, returns Ok with array of values.
 * If any Result is Err, returns the first Err encountered.
 *
 * @example
 * const results = collect([Ok(1), Ok(2), Ok(3)]);
 * // Result<[number, number, number], never>
 */
export function collect<T extends readonly Result<any, any>[]>(
    results: T
): Result<
    { [K in keyof T]: T[K] extends Result<infer U, any> ? U : never },
    { [K in keyof T]: T[K] extends Result<any, infer E> ? E : never }[number]
> {
    const values: any[] = [];
    for (const result of results) {
        if (result.is_err()) {
            return result as any;
        }
        values.push(result.value);
    }
    return Ok(values) as any;
}

/**
 * Type-safe match expression for Result.
 *
 * @example
 * const message = matchResult(result, {
 *     Ok: (value) => `Success: ${value}`,
 *     Err: (error) => `Failed: ${error.message}`,
 * });
 */
export function matchResult<T, E, R>(
    result: Result<T, E>,
    handlers: {
        Ok: (value: T) => R;
        Err: (error: E) => R;
    }
): R {
    if (result.is_ok()) {
        return handlers.Ok(result.value);
    } else {
        return handlers.Err(result.value);
    }
}
