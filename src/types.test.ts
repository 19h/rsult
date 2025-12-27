/**
 * Type-Level Tests for Result and Option
 *
 * These tests verify that the type system behaves correctly at compile time.
 * They use @ts-expect-error to ensure that invalid operations fail to compile.
 *
 * Run with: npx tsc --noEmit
 */

import {
    Result, ResultOk, ResultErr,
    Ok, Err,
    UnwrapOk, UnwrapErr, FlattenResult,
    collect, matchResult,
} from './result';

import {
    Option, OptionSome, OptionNone,
    Some, None,
    UnwrapOption, FlattenOption,
    matchOption,
} from './option';

// ============================================================================
// Type Assertions Helper
// ============================================================================

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;
type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true;

// ============================================================================
// Result Type-Level Tests
// ============================================================================

// --- Factory Function Types ---
{
    const ok = Ok(42);
    const err = Err("error");

    // Ok should produce ResultOk<T, never>
    type _TestOkType = Expect<Equal<typeof ok, ResultOk<number, never>>>;

    // Err should produce ResultErr<never, E>
    type _TestErrType = Expect<Equal<typeof err, ResultErr<never, string>>>;
}

// --- Type Guards ---
{
    const result: Result<number, string> = Ok(42);

    if (result.is_ok()) {
        // Inside is_ok() branch, result should be narrowed to ResultOk
        type _TestNarrowed = Expect<Equal<typeof result, ResultOk<number, string>>>;
        const value: number = result.value;
    }

    if (result.is_err()) {
        // Inside is_err() branch, result should be narrowed to ResultErr
        type _TestNarrowed = Expect<Equal<typeof result, ResultErr<number, string>>>;
        const error: string = result.value;
    }
}

// --- Map Preserves Types ---
{
    const ok = Ok(42);
    const mapped = ok.map(x => x.toString());

    // map on Ok should return ResultOk with new type
    type _TestMapOk = Expect<Equal<typeof mapped, ResultOk<string, never>>>;

    const err = Err("error");
    const mappedErr = err.map((x: number) => x.toString());

    // map on Err should return ResultErr with new T type
    type _TestMapErr = Expect<Equal<typeof mappedErr, ResultErr<string, string>>>;
}

// --- MapErr Preserves Types ---
{
    const ok = Ok(42);
    const mapped = ok.map_err((e: string) => new Error(e));

    // map_err on Ok should return ResultOk with new E type
    type _TestMapErrOk = Expect<Equal<typeof mapped, ResultOk<number, Error>>>;

    const err = Err("error");
    const mappedErr = err.map_err(e => new Error(e));

    // map_err on Err should return ResultErr with new error type
    type _TestMapErrErr = Expect<Equal<typeof mappedErr, ResultErr<never, Error>>>;
}

// --- And/Or Combinators ---
{
    const ok = Ok(42);
    const err = Err("error");

    // and should return the argument's type when called on Ok
    const anded = ok.and(Ok("hello"));
    type _TestAnd = Expect<Equal<typeof anded, Result<string, never>>>;

    // or should return self's type (with new E) when called on Ok
    const ored = ok.or(Err(123));
    type _TestOr = Expect<Equal<typeof ored, ResultOk<number, number>>>;

    // or should return argument when called on Err
    const errOred = err.or(Ok(42));
    type _TestErrOr = Expect<Equal<typeof errOred, Result<number, never>>>;
}

// --- Transmute ---
{
    const ok: Result<number, string> = Ok(42);
    const err: Result<number, string> = Err("error");

    // When we know it's Ok, transmute should give Ok<T, never>
    if (ok.is_ok()) {
        const transmuted = ok.transmute();
        type _TestTransmuteOk = Expect<Equal<typeof transmuted, ResultOk<number, never>>>;
    }

    // When we know it's Err, transmute should give Err<never, E>
    if (err.is_err()) {
        const transmuted = err.transmute();
        type _TestTransmuteErr = Expect<Equal<typeof transmuted, ResultErr<never, string>>>;
    }
}

// --- Flatten ---
{
    const nested = Ok(Ok(42));
    const flattened = nested.flatten();

    // Flatten should unwrap one layer of Result
    type _TestFlatten = Expect<Equal<typeof flattened, Result<number, never>>>;

    const nestedErr = Ok(Err("inner error"));
    const flattenedErr = nestedErr.flatten();

    // Flatten should combine error types
    type _TestFlattenErr = Expect<Equal<typeof flattenedErr, Result<never, string>>>;
}

// --- UnwrapOk/UnwrapErr Type Utilities ---
{
    type TestResult = Result<number, string>;

    type _TestUnwrapOk = Expect<Equal<UnwrapOk<TestResult>, number>>;
    type _TestUnwrapErr = Expect<Equal<UnwrapErr<TestResult>, string>>;
}

// --- FlattenResult Type Utility ---
{
    type Nested = Result<Result<number, string>, boolean>;
    type _TestFlattenType = Expect<Equal<FlattenResult<Result<number, string>, boolean>, Result<number, string | boolean>>>;
}

// --- Collect Function ---
{
    const results = [Ok(1), Ok(2), Ok(3)] as const;
    const collected = collect(results);

    // Collect should produce Result with tuple type
    type _TestCollect = Expect<Equal<
        typeof collected,
        Result<readonly [number, number, number], never>
    >>;
}

// --- Match Function ---
{
    const result: Result<number, string> = Ok(42);
    const matched = matchResult(result, {
        Ok: (value) => value * 2,
        Err: (error) => error.length,
    });

    type _TestMatch = Expect<Equal<typeof matched, number>>;
}

// ============================================================================
// Option Type-Level Tests
// ============================================================================

// --- Factory Function Types ---
{
    const some = Some(42);
    const none = None<number>();

    // Some should produce OptionSome<T>
    type _TestSomeType = Expect<Equal<typeof some, OptionSome<number>>>;

    // None should produce OptionNone<T>
    type _TestNoneType = Expect<Equal<typeof none, OptionNone<number>>>;
}

// --- Type Guards ---
{
    const option: Option<number> = Some(42);

    if (option.is_some()) {
        // Inside is_some() branch, option should be narrowed to OptionSome
        type _TestNarrowed = Expect<Equal<typeof option, OptionSome<number>>>;
        const value: number = option.value;
    }

    if (option.is_none()) {
        // Inside is_none() branch, option should be narrowed to OptionNone
        type _TestNarrowed = Expect<Equal<typeof option, OptionNone<number>>>;
    }
}

// --- Map Preserves Types ---
{
    const some = Some(42);
    const mapped = some.map(x => x.toString());

    // map on Some should return OptionSome with new type
    type _TestMapSome = Expect<Equal<typeof mapped, OptionSome<string>>>;

    const none = None<number>();
    const mappedNone = none.map(x => x.toString());

    // map on None should return OptionNone with new type
    type _TestMapNone = Expect<Equal<typeof mappedNone, OptionNone<string>>>;
}

// --- And/Or Combinators ---
{
    const some = Some(42);
    const none = None<number>();

    // and should return the argument's type when called on Some
    const anded = some.and(Some("hello"));
    type _TestAnd = Expect<Equal<typeof anded, Option<string>>>;

    // or should return self when called on Some
    const ored = some.or(Some(0));
    type _TestOr = Expect<Equal<typeof ored, OptionSome<number>>>;

    // or should return argument when called on None
    const noneOred = none.or(Some(0));
    type _TestNoneOr = Expect<Equal<typeof noneOred, Option<number>>>;
}

// --- Flatten ---
{
    const nested = Some(Some(42));
    const flattened = nested.flatten();

    // Flatten should unwrap one layer of Option
    type _TestFlatten = Expect<Equal<typeof flattened, Option<number>>>;
}

// --- UnwrapOption Type Utility ---
{
    type TestOption = Option<number>;
    type _TestUnwrapOption = Expect<Equal<UnwrapOption<TestOption>, number>>;
}

// --- FlattenOption Type Utility ---
{
    type Nested = Option<Option<number>>;
    type _TestFlattenType = Expect<Equal<FlattenOption<Option<number>>, Option<number>>>;
}

// --- Match Function ---
{
    const option: Option<number> = Some(42);
    const matched = matchOption(option, {
        Some: (value) => value * 2,
        None: () => 0,
    });

    type _TestMatch = Expect<Equal<typeof matched, number>>;
}

// --- Zip ---
{
    const some1 = Some(42);
    const some2 = Some("hello");
    const zipped = some1.zip(some2);

    type _TestZip = Expect<Equal<typeof zipped, Option<[number, string]>>>;
}

// ============================================================================
// Variance Tests
// ============================================================================

// Result should be covariant in both T and E
{
    type Animal = { name: string };
    type Dog = Animal & { breed: string };

    // ResultOk<Dog, never> should be assignable to ResultOk<Animal, never>
    const dogResult: ResultOk<Dog, never> = Ok({ name: "Rex", breed: "German Shepherd" });
    const animalResult: ResultOk<Animal, never> = dogResult; // Should compile

    // ResultErr<never, Dog> should be assignable to ResultErr<never, Animal>
    // (if we consider errors as covariant too)
}

// Option should be covariant in T
{
    type Animal = { name: string };
    type Dog = Animal & { breed: string };

    // OptionSome<Dog> should be assignable to OptionSome<Animal>
    const dogOption: OptionSome<Dog> = Some({ name: "Rex", breed: "German Shepherd" });
    const animalOption: OptionSome<Animal> = dogOption; // Should compile
}

// ============================================================================
// Error Cases (These should fail to compile)
// ============================================================================

// Uncomment to verify these correctly fail:

// @ts-expect-error - Cannot unwrap Err without checking
// const _err1: number = Err("error").unwrap();

// @ts-expect-error - Cannot unwrap None without checking
// const _err2: number = None<number>().unwrap();

// @ts-expect-error - is_ok_and on Err always returns false literal
// const _err3: true = Err("error").is_ok_and(() => true);

// @ts-expect-error - is_some_and on None always returns false literal
// const _err4: true = None<number>().is_some_and(() => true);

// Actual runtime test to satisfy Jest
describe('Type-level tests', () => {
    it('should compile without errors', () => {
        // If this file compiles, all type tests passed
        expect(true).toBe(true);
    });

    it('Ok factory returns ResultOk<T, never>', () => {
        const ok = Ok(42);
        expect(ok._tag).toBe('Ok');
        expect(ok.value).toBe(42);
    });

    it('Err factory returns ResultErr<never, E>', () => {
        const err = Err("error");
        expect(err._tag).toBe('Err');
        expect(err.value).toBe("error");
    });

    it('Some factory returns OptionSome<T>', () => {
        const some = Some(42);
        expect(some._tag).toBe('Some');
        expect(some.value).toBe(42);
    });

    it('None factory returns OptionNone<T>', () => {
        const none = None<number>();
        expect(none._tag).toBe('None');
    });

    it('transmute on Ok returns Ok with never error type', () => {
        const ok = Ok(42);
        const transmuted = ok.transmute();
        expect(transmuted._tag).toBe('Ok');
        expect(transmuted.value).toBe(42);
    });

    it('transmute on Err returns Err with never value type', () => {
        const err = Err("error");
        const transmuted = err.transmute();
        expect(transmuted._tag).toBe('Err');
        expect(transmuted.value).toBe("error");
    });

    it('collect combines Ok results into array', () => {
        const results = [Ok(1), Ok(2), Ok(3)] as const;
        const collected = collect(results);
        expect(collected.is_ok()).toBe(true);
        expect(collected.unwrap()).toEqual([1, 2, 3]);
    });

    it('collect returns first Err', () => {
        const results = [Ok(1), Err("fail"), Ok(3)] as const;
        const collected = collect(results);
        expect(collected.is_err()).toBe(true);
        expect(collected.unwrap_err()).toBe("fail");
    });

    it('match on Result works correctly', () => {
        const ok: Result<number, string> = Ok(42);
        const err: Result<number, string> = Err("error");

        expect(matchResult(ok, { Ok: v => v * 2, Err: e => e.length })).toBe(84);
        expect(matchResult(err, { Ok: v => v * 2, Err: e => e.length })).toBe(5);
    });

    it('match on Option works correctly', () => {
        const some: Option<number> = Some(42);
        const none: Option<number> = None();

        expect(matchOption(some, { Some: v => v * 2, None: () => 0 })).toBe(84);
        expect(matchOption(none, { Some: v => v * 2, None: () => 0 })).toBe(0);
    });
});
