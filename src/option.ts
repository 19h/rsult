// ============================================================================
// Type-Level Utilities
// ============================================================================

/** Unique brand symbols for nominal typing */
declare const SomeBrand: unique symbol;
declare const NoneBrand: unique symbol;

/** Extract the inner type from an Option */
export type UnwrapOption<O> = O extends Option<infer T> ? T : never;

/** Unwrap nested Option types for flatten() */
export type FlattenOption<T> = T extends Option<infer U> ? Option<U> : Option<T>;

/** Type-level check for nested Options */
export type IsNestedOption<T> = T extends Option<any> ? true : false;

// ============================================================================
// Option Type Definition
// ============================================================================

/**
 * A discriminated union representing an optional value.
 *
 * An `Option<T>` is either `Some(T)` containing a value, or `None` representing absence.
 *
 * @typeParam T - The type of the contained value
 */
export type Option<T> = OptionSome<T> | OptionNone<T>;

// ============================================================================
// Core Interfaces
// ============================================================================

export interface IOptionCheck<T> {
    /**
     * Returns `true` if the option is `Some`.
     *
     * This is a type guard that narrows the type to `OptionSome<T>`.
     */
    is_some(): this is OptionSome<T>;

    /**
     * Returns `true` if `Some` and the value satisfies the predicate.
     */
    is_some_and(f: (arg: T) => boolean): boolean;

    /**
     * Returns `true` if the option is `None`.
     *
     * This is a type guard that narrows the type to `OptionNone<T>`.
     */
    is_none(): this is OptionNone<T>;

    /**
     * Returns `true` if `None` OR if the value satisfies the predicate.
     *
     * This is the logical complement of `is_some_and` with negated predicate.
     *
     * @example
     * ```typescript
     * Some(2).is_none_or(x => x > 1)  // true
     * Some(0).is_none_or(x => x > 1)  // false
     * None().is_none_or(x => x > 1)   // true
     * ```
     */
    is_none_or(f: (arg: T) => boolean): boolean;
}

export interface IOptionExpect<T> {
    /**
     * Returns the contained `Some` value, or throws with the provided message.
     *
     * @throws Error with `msg` if this is `None`
     */
    expect(msg: string): T;
}

export interface IOptionTransform<T> {
    /**
     * Maps an `Option<T>` to `Option<U>` by applying `fn` to the contained value.
     */
    map<U>(fn: (arg: T) => U): Option<U>;

    /**
     * Returns the provided default (if `None`), or applies `fn` to the contained value.
     */
    map_or<U>(defaultVal: U, fn: (arg: T) => U): U;

    /**
     * Calls `fn` with the contained value for side effects, then returns the original option.
     *
     * @example
     * ```typescript
     * Some(5)
     *     .inspect(x => console.log(`value: ${x}`))
     *     .map(x => x * 2)
     * ```
     */
    inspect(f: (val: T) => void): this;
}

export interface IOptionCombine<T> {
    /**
     * Returns `None` if `self` is `None`, otherwise returns `opt`.
     */
    and<U>(opt: Option<U>): Option<U>;

    /**
     * Returns `None` if `self` is `None`, otherwise calls `fn` with the wrapped value.
     * This is the monadic bind operation (flatMap).
     */
    and_then<U>(fn: (arg: T) => Option<U>): Option<U>;

    /**
     * Returns `self` if `Some`, otherwise returns `opt`.
     */
    or<U>(opt: Option<U>): Option<T | U>;

    /**
     * Returns `self` if `Some`, otherwise calls `fn` and returns the result.
     */
    or_else<U>(fn: () => Option<U>): Option<T | U>;

    /**
     * Returns `Some` if exactly one of `self` and `optb` is `Some`, otherwise `None`.
     */
    xor(optb: Option<T>): Option<T>;
}

export interface IOptionUtility<T> {
    /**
     * Returns the contained `Some` value, or throws.
     *
     * @throws Error if this is `None`
     */
    unwrap(): T;

    /**
     * Returns the contained `Some` value, or the provided default.
     */
    unwrap_or(optb: T): T;

    /**
     * Returns the contained `Some` value, or computes it from `fn`.
     */
    unwrap_or_else(fn: () => T): T;

    /**
     * Returns the contained `Some` value, or `null` if `None`.
     */
    unwrap_or_default(): T | null;
}

export interface IOptionMutate<T> {
    /**
     * Takes the value out of the option, leaving a `None` in its place.
     *
     * @returns An `Option` containing the original value
     */
    take(): Option<T>;

    /**
     * Takes the value out if it satisfies the predicate, leaving `None` in its place.
     */
    take_if(predicate: (arg: T) => boolean): Option<T>;

    /**
     * Replaces the actual value with the provided one, returning the old value.
     *
     * @returns An `Option` containing the old value
     */
    replace(value: T): Option<T>;
}

export interface IOptionZip<T> {
    /**
     * Zips `self` with another `Option`.
     *
     * Returns `Some([T, U])` if both are `Some`, otherwise `None`.
     */
    zip<U>(other: Option<U>): Option<[T, U]>;

    /**
     * Zips `self` and another `Option` with a function.
     *
     * Returns `Some(f(t, u))` if both are `Some`, otherwise `None`.
     */
    zip_with<U, R>(other: Option<U>, f: (val: T, other: U) => R): Option<R>;
}

export interface IOptionFilter<T> {
    /**
     * Returns `None` if `self` is `None`, otherwise calls `predicate` with the wrapped value.
     *
     * Returns `Some(t)` if the predicate returns `true`, otherwise `None`.
     */
    filter(predicate: (arg: T) => boolean): Option<T>;
}

export interface IOptionFlatten<T> {
    /**
     * Flattens an `Option<Option<U>>` to `Option<U>`.
     *
     * If `T` is not an `Option`, this returns the option unchanged.
     */
    flatten(): FlattenOption<T>;
}

// Forward declaration for Result types (will be imported at runtime)
type ResultLike<T, E> = { is_ok(): boolean; value: T | E; _tag: 'Ok' | 'Err' };

export interface IOptionConvert<T> {
    /**
     * Transforms `Option<T>` into `Result<T, E>`.
     *
     * Returns `Ok(v)` if `Some(v)`, otherwise `Err(err)`.
     *
     * @example
     * ```typescript
     * Some(5).ok_or("missing")     // Ok(5)
     * None().ok_or("missing")      // Err("missing")
     * ```
     */
    ok_or<E>(err: E): { _tag: 'Ok' | 'Err'; value: T | E };

    /**
     * Transforms `Option<T>` into `Result<T, E>` with a lazily computed error.
     *
     * Returns `Ok(v)` if `Some(v)`, otherwise `Err(err())`.
     *
     * @example
     * ```typescript
     * Some(5).ok_or_else(() => new Error("missing"))  // Ok(5)
     * None().ok_or_else(() => new Error("missing"))   // Err(Error)
     * ```
     */
    ok_or_else<E>(err: () => E): { _tag: 'Ok' | 'Err'; value: T | E };
}

export interface IOptionAdvanced<T> {
    /**
     * Unzips an option containing a tuple into a tuple of options.
     *
     * @example
     * ```typescript
     * Some([1, "hi"]).unzip()  // [Some(1), Some("hi")]
     * None().unzip()           // [None, None]
     * ```
     */
    unzip(): T extends [infer A, infer B] ? [Option<A>, Option<B>] : never;

    /**
     * Transposes an `Option` of a `Result` into a `Result` of an `Option`.
     *
     * - `None` → `Ok(None)`
     * - `Some(Ok(x))` → `Ok(Some(x))`
     * - `Some(Err(e))` → `Err(e)`
     *
     * @example
     * ```typescript
     * Some(Ok(5)).transpose()   // Ok(Some(5))
     * Some(Err("e")).transpose() // Err("e")
     * None().transpose()         // Ok(None)
     * ```
     */
    transpose(): T extends { _tag: 'Ok'; value: infer U }
        ? { _tag: 'Ok'; value: Option<U> }
        : T extends { _tag: 'Err'; value: infer E }
        ? { _tag: 'Err'; value: E }
        : { _tag: 'Ok'; value: Option<unknown> };
}

/**
 * The complete Option interface combining all capability interfaces.
 */
export interface IOption<T> extends
    IOptionCheck<T>,
    IOptionExpect<T>,
    IOptionTransform<T>,
    IOptionCombine<T>,
    IOptionUtility<T>,
    IOptionMutate<T>,
    IOptionZip<T>,
    IOptionFilter<T>,
    IOptionFlatten<T>,
    IOptionConvert<T>,
    IOptionAdvanced<T> {}

// ============================================================================
// OptionSome Implementation
// ============================================================================

/**
 * The `Some` variant of `Option<T>`, representing a present value.
 *
 * Uses branded typing for nominal type safety.
 *
 * @typeParam T - The type of the contained value
 */
export class OptionSome<out T> implements IOption<T> {
    /** Brand for nominal typing - ensures OptionSome is distinct from OptionNone */
    declare readonly [SomeBrand]: T;

    /** Discriminant tag for runtime type checking */
    readonly _tag = 'Some' as const;

    constructor(public value: T) {}

    // Type guards
    is_some(): this is OptionSome<T> {
        return true;
    }

    is_some_and(f: (arg: T) => boolean): boolean {
        return f(this.value);
    }

    is_none(): this is OptionNone<T> {
        return false;
    }

    is_none_or(f: (arg: T) => boolean): boolean {
        return f(this.value);
    }

    // Extraction
    expect(_msg: string): T {
        return this.value;
    }

    unwrap(): T {
        return this.value;
    }

    unwrap_or(_optb: T): T {
        return this.value;
    }

    unwrap_or_else(_fn: () => T): T {
        return this.value;
    }

    unwrap_or_default(): T {
        return this.value;
    }

    // Transformations
    map<U>(fn: (arg: T) => U): OptionSome<U> {
        return new OptionSome(fn(this.value));
    }

    map_or<U>(_defaultVal: U, fn: (arg: T) => U): U {
        return fn(this.value);
    }

    inspect(f: (val: T) => void): this {
        f(this.value);
        return this;
    }

    // Combinators
    and<U>(opt: Option<U>): Option<U> {
        return opt;
    }

    and_then<U>(fn: (arg: T) => Option<U>): Option<U> {
        return fn(this.value);
    }

    /**
     * On Some, `or` returns self.
     * Returns this instance typed as Option<T | U> for type compatibility.
     */
    or<U>(_opt: Option<U>): OptionSome<T> {
        return this;
    }

    /**
     * On Some, `or_else` returns self.
     */
    or_else<U>(_fn: () => Option<U>): OptionSome<T> {
        return this;
    }

    xor(optb: Option<T>): Option<T> {
        if (optb.is_some()) {
            return new OptionNone();
        }
        return this;
    }

    // Filtering
    filter(predicate: (arg: T) => boolean): Option<T> {
        if (predicate(this.value)) {
            return this;
        }
        return new OptionNone();
    }

    // Mutation
    take(): Option<T> {
        const value = this.value;
        // Mutate in place - this is intentional per the Rust API
        (this as { value: T | undefined }).value = undefined as any;
        return new OptionSome(value);
    }

    take_if(predicate: (arg: T) => boolean): Option<T> {
        if (predicate(this.value)) {
            return this.take();
        }
        return new OptionNone();
    }

    replace(value: T): Option<T> {
        const oldValue = this.value;
        this.value = value;
        return new OptionSome(oldValue);
    }

    // Zipping
    zip<U>(other: Option<U>): Option<[T, U]> {
        if (other.is_some()) {
            return new OptionSome<[T, U]>([this.value, other.value]);
        }
        return new OptionNone();
    }

    zip_with<U, R>(other: Option<U>, f: (val: T, other: U) => R): Option<R> {
        if (other.is_some()) {
            return new OptionSome(f(this.value, other.value));
        }
        return new OptionNone();
    }

    // Flattening
    flatten(): FlattenOption<T> {
        const val = this.value;
        if (val instanceof OptionSome) {
            return val as FlattenOption<T>;
        }
        if (val instanceof OptionNone) {
            return val as FlattenOption<T>;
        }
        // T is not an Option, return self unchanged
        return this as unknown as FlattenOption<T>;
    }

    // Conversion to Result
    ok_or<E>(_err: E): { _tag: 'Ok'; value: T } {
        return { _tag: 'Ok', value: this.value };
    }

    ok_or_else<E>(_err: () => E): { _tag: 'Ok'; value: T } {
        return { _tag: 'Ok', value: this.value };
    }

    // Advanced
    unzip(): T extends [infer A, infer B] ? [Option<A>, Option<B>] : never {
        const [a, b] = this.value as [unknown, unknown];
        return [new OptionSome(a), new OptionSome(b)] as any;
    }

    transpose(): any {
        const result = this.value as { _tag: 'Ok' | 'Err'; value: unknown; is_ok?(): boolean };
        if (result._tag === 'Ok' || (result.is_ok && result.is_ok())) {
            return { _tag: 'Ok', value: new OptionSome(result.value) };
        } else {
            return { _tag: 'Err', value: result.value };
        }
    }
}

// ============================================================================
// OptionNone Implementation
// ============================================================================

/**
 * The `None` variant of `Option<T>`, representing absence of a value.
 *
 * Uses branded typing for nominal type safety.
 *
 * @typeParam T - The phantom type parameter for type compatibility
 */
export class OptionNone<out T = never> implements IOption<T> {
    /** Brand for nominal typing - ensures OptionNone is distinct from OptionSome */
    declare readonly [NoneBrand]: void;

    /** Discriminant tag for runtime type checking */
    readonly _tag = 'None' as const;

    // Type guards
    is_some(): this is OptionSome<T> {
        return false;
    }

    is_some_and(_f: (arg: T) => boolean): false {
        return false;
    }

    is_none(): this is OptionNone<T> {
        return true;
    }

    is_none_or(_f: (arg: T) => boolean): true {
        return true;
    }

    // Extraction
    expect(msg: string): never {
        throw new Error(msg);
    }

    unwrap(): never {
        throw new Error('Called Option.unwrap() on a None value');
    }

    unwrap_or(optb: T): T {
        return optb;
    }

    unwrap_or_else(fn: () => T): T {
        return fn();
    }

    unwrap_or_default(): null {
        return null;
    }

    // Transformations
    /**
     * On None, map returns None with updated type parameter.
     */
    map<U>(_fn: (arg: T) => U): OptionNone<U> {
        return new OptionNone<U>();
    }

    map_or<U>(defaultVal: U, _fn: (arg: T) => U): U {
        return defaultVal;
    }

    inspect(_f: (val: T) => void): this {
        return this;
    }

    // Combinators
    /**
     * On None, `and` returns None with updated type parameter.
     */
    and<U>(_opt: Option<U>): OptionNone<U> {
        return new OptionNone<U>();
    }

    /**
     * On None, `and_then` returns None with updated type parameter.
     */
    and_then<U>(_fn: (arg: T) => Option<U>): OptionNone<U> {
        return new OptionNone<U>();
    }

    or<U>(opt: Option<U>): Option<U> {
        return opt;
    }

    or_else<U>(fn: () => Option<U>): Option<U> {
        return fn();
    }

    xor(optb: Option<T>): Option<T> {
        return optb;
    }

    // Filtering
    /**
     * On None, filter returns None.
     */
    filter(_predicate: (arg: T) => boolean): OptionNone<T> {
        return this;
    }

    // Mutation
    take(): OptionNone<T> {
        return this;
    }

    take_if(_predicate: (arg: T) => boolean): OptionNone<T> {
        return this;
    }

    /**
     * On None, replace returns Some with the provided value.
     *
     * Note: This differs from Rust's semantics where replace would mutate
     * self to become Some and return the old value (None). Here we maintain
     * immutability - self remains None and we return Some(value).
     */
    replace(value: T): OptionSome<T> {
        return new OptionSome<T>(value);
    }

    // Zipping
    zip<U>(_other: Option<U>): OptionNone<[T, U]> {
        return new OptionNone();
    }

    zip_with<U, R>(_other: Option<U>, _f: (val: T, other: U) => R): OptionNone<R> {
        return new OptionNone();
    }

    // Flattening
    flatten(): FlattenOption<T> {
        return new OptionNone() as FlattenOption<T>;
    }

    // Conversion to Result
    ok_or<E>(err: E): { _tag: 'Err'; value: E } {
        return { _tag: 'Err', value: err };
    }

    ok_or_else<E>(err: () => E): { _tag: 'Err'; value: E } {
        return { _tag: 'Err', value: err() };
    }

    // Advanced
    unzip(): T extends [infer A, infer B] ? [Option<A>, Option<B>] : never {
        return [new OptionNone(), new OptionNone()] as any;
    }

    transpose(): any {
        return { _tag: 'Ok', value: new OptionNone() };
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a `Some` option containing the given value.
 *
 * @example
 * const opt = Some(42);  // Option<number>
 * const mapped = opt.map(x => x * 2);  // Option<number>
 */
export const Some = <T>(val: T): OptionSome<T> => {
    return new OptionSome(val);
};

/**
 * Creates a `None` option of the specified type.
 *
 * @example
 * const opt = None<number>();  // Option<number>
 * const fallback = opt.or(Some(0));  // Option<number>
 */
export const None = <T = never>(): OptionNone<T> => {
    return new OptionNone<T>();
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a nullable value to an Option.
 *
 * Returns `Some(val)` if the value is not null/undefined, otherwise `None`.
 *
 * @example
 * const opt1 = option_from_nullable("hello");  // Some("hello")
 * const opt2 = option_from_nullable(null);     // None
 * const opt3 = option_from_nullable(undefined); // None
 */
export const option_from_nullable = <T>(val: T | null | undefined): Option<NonNullable<T>> => {
    if (val === null || val === undefined) {
        return None();
    }
    return Some(val as NonNullable<T>);
};

/**
 * Converts a Promise to an Option wrapped in a Promise.
 *
 * If the promise resolves, returns `Some(value)`.
 * If it rejects, returns `None`.
 *
 * @example
 * const opt = await option_from_promise(fetch('/api/data'));
 * // Option<Response>
 */
export const option_from_promise = <T>(promise: Promise<T>): Promise<Option<T>> =>
    promise.then(Some).catch(() => None<T>());

// ============================================================================
// Advanced Type Utilities
// ============================================================================

/**
 * Type-safe match expression for Option.
 *
 * @example
 * const message = matchOption(option, {
 *     Some: (value) => `Found: ${value}`,
 *     None: () => "Not found",
 * });
 */
export function matchOption<T, R>(
    option: Option<T>,
    handlers: {
        Some: (value: T) => R;
        None: () => R;
    }
): R {
    if (option.is_some()) {
        return handlers.Some(option.value);
    } else {
        return handlers.None();
    }
}

/**
 * Transposes an Option of a Result into a Result of an Option.
 *
 * - `None` -> `Ok(None)`
 * - `Some(Ok(x))` -> `Ok(Some(x))`
 * - `Some(Err(e))` -> `Err(e)`
 *
 * This is useful for error handling in option chains.
 */
// Note: This requires importing Result types, so we use a type-only approach
export type TransposeOption<T> = T extends { is_ok(): boolean; value: infer V }
    ? T extends { _tag: 'Ok' }
        ? { _tag: 'Ok'; value: Option<V> }
        : T extends { _tag: 'Err' }
        ? T
        : never
    : never;
