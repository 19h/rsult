import { ResultAsync, tryAsync, liftAsync, allAsync } from './result-async';
import { Result, Ok, Err } from './result';

describe('ResultAsync', () => {
    describe('Constructors', () => {
        it('ok() creates successful ResultAsync', async () => {
            const result = await ResultAsync.ok(42);
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toBe(42);
        });

        it('err() creates failed ResultAsync', async () => {
            const result = await ResultAsync.err('error');
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toBe('error');
        });

        it('fromResult() wraps a sync Result', async () => {
            const result = await ResultAsync.fromResult(Ok(42));
            expect(result.unwrap()).toBe(42);
        });

        it('fromResult() wraps a Promise<Result>', async () => {
            const result = await ResultAsync.fromResult(Promise.resolve(Ok(42)));
            expect(result.unwrap()).toBe(42);
        });

        it('fromPromise() converts resolved promise to Ok', async () => {
            const result = await ResultAsync.fromPromise(Promise.resolve(42));
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toBe(42);
        });

        it('fromPromise() converts rejected promise to Err', async () => {
            const error = new Error('failed');
            const result = await ResultAsync.fromPromise(Promise.reject(error));
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toBe(error);
        });

        it('fromPromise() applies error mapping function', async () => {
            const result = await ResultAsync.fromPromise(
                Promise.reject(new Error('original')),
                (e) => ({ type: 'mapped', original: e })
            );
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toEqual({ type: 'mapped', original: expect.any(Error) });
        });

        it('try() catches sync errors', async () => {
            const result = await ResultAsync.try(() => {
                throw new Error('sync error');
            });
            expect(result.is_err()).toBe(true);
        });

        it('try() catches async errors', async () => {
            const result = await ResultAsync.try(async () => {
                throw new Error('async error');
            });
            expect(result.is_err()).toBe(true);
        });

        it('try() returns Ok on success', async () => {
            const result = await ResultAsync.try(async () => 42);
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toBe(42);
        });
    });

    describe('Transformations', () => {
        it('map() transforms Ok value with sync function', async () => {
            const result = await ResultAsync.ok(5).map(x => x * 2);
            expect(result.unwrap()).toBe(10);
        });

        it('map() transforms Ok value with async function', async () => {
            const result = await ResultAsync.ok(5).map(async x => x * 2);
            expect(result.unwrap()).toBe(10);
        });

        it('map() skips transformation on Err', async () => {
            const result = await ResultAsync.err<number, string>('error').map(x => x * 2);
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toBe('error');
        });

        it('mapErr() transforms Err value', async () => {
            const result = await ResultAsync.err('error').mapErr(e => e.toUpperCase());
            expect(result.unwrap_err()).toBe('ERROR');
        });

        it('mapErr() skips transformation on Ok', async () => {
            const result = await ResultAsync.ok(42).mapErr(e => 'mapped');
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toBe(42);
        });

        it('mapOr() returns mapped value on Ok', async () => {
            const value = await ResultAsync.ok(5).mapOr(0, x => x * 2);
            expect(value).toBe(10);
        });

        it('mapOr() returns default on Err', async () => {
            const value = await ResultAsync.err<number, string>('error').mapOr(0, x => x * 2);
            expect(value).toBe(0);
        });

        it('mapOrElse() computes from error on Err', async () => {
            const value = await ResultAsync.err<number, string>('error').mapOrElse(
                e => e.length,
                x => x * 2
            );
            expect(value).toBe(5);
        });
    });

    describe('Chaining', () => {
        it('andThen() chains sync Result', async () => {
            const result = await ResultAsync.ok(5)
                .andThen(x => Ok(x * 2));
            expect(result.unwrap()).toBe(10);
        });

        it('andThen() chains ResultAsync', async () => {
            const result = await ResultAsync.ok(5)
                .andThen(x => ResultAsync.ok(x * 2));
            expect(result.unwrap()).toBe(10);
        });

        it('andThen() propagates Err', async () => {
            const result = await ResultAsync.ok(5)
                .andThen(x => Err('failed') as Result<number, string>);
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toBe('failed');
        });

        it('andThen() skips on initial Err', async () => {
            let called = false;
            const result = await ResultAsync.err<number, string>('initial')
                .andThen(x => {
                    called = true;
                    return Ok(x * 2);
                });
            expect(called).toBe(false);
            expect(result.unwrap_err()).toBe('initial');
        });

        it('orElse() recovers from Err', async () => {
            const result = await ResultAsync.err<number, string>('error')
                .orElse(e => Ok(42));
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toBe(42);
        });

        it('orElse() skips on Ok', async () => {
            let called = false;
            const result = await ResultAsync.ok<number, string>(42)
                .orElse(e => {
                    called = true;
                    return Ok(0);
                });
            expect(called).toBe(false);
            expect(result.unwrap()).toBe(42);
        });

        it('and() returns other on Ok', async () => {
            const result = await ResultAsync.ok(1).and(ResultAsync.ok('hello'));
            expect(result.unwrap()).toBe('hello');
        });

        it('and() returns Err on initial Err', async () => {
            const result = await ResultAsync.err<number, string>('error')
                .and(ResultAsync.ok('hello'));
            expect(result.is_err()).toBe(true);
        });

        it('or() returns self on Ok', async () => {
            const result = await ResultAsync.ok<number, string>(42)
                .or(ResultAsync.ok(0));
            expect(result.unwrap()).toBe(42);
        });

        it('or() returns other on Err', async () => {
            const result = await ResultAsync.err<number, string>('error')
                .or(ResultAsync.ok(0));
            expect(result.unwrap()).toBe(0);
        });
    });

    describe('Unwrapping', () => {
        it('expect() returns value on Ok', async () => {
            const value = await ResultAsync.ok(42).expect('should not fail');
            expect(value).toBe(42);
        });

        it('expect() throws on Err', async () => {
            await expect(ResultAsync.err('error').expect('custom message'))
                .rejects.toThrow('custom message');
        });

        it('unwrap() returns value on Ok', async () => {
            const value = await ResultAsync.ok(42).unwrap();
            expect(value).toBe(42);
        });

        it('unwrap() throws on Err', async () => {
            await expect(ResultAsync.err('error').unwrap()).rejects.toThrow();
        });

        it('unwrapOr() returns value on Ok', async () => {
            const value = await ResultAsync.ok(42).unwrapOr(0);
            expect(value).toBe(42);
        });

        it('unwrapOr() returns default on Err', async () => {
            const value = await ResultAsync.err<number, string>('error').unwrapOr(0);
            expect(value).toBe(0);
        });

        it('unwrapOrElse() computes from error', async () => {
            const value = await ResultAsync.err<number, string>('error')
                .unwrapOrElse(e => e.length);
            expect(value).toBe(5);
        });
    });

    describe('Inspection', () => {
        it('inspect() calls function on Ok', async () => {
            let inspected: number | null = null;
            await ResultAsync.ok(42).inspect(x => { inspected = x; });
            expect(inspected).toBe(42);
        });

        it('inspect() skips on Err', async () => {
            let called = false;
            await ResultAsync.err<number, string>('error').inspect(() => { called = true; });
            expect(called).toBe(false);
        });

        it('inspectErr() calls function on Err', async () => {
            let inspected: string | null = null;
            await ResultAsync.err('error').inspectErr(e => { inspected = e; });
            expect(inspected).toBe('error');
        });

        it('inspectErr() skips on Ok', async () => {
            let called = false;
            await ResultAsync.ok(42).inspectErr(() => { called = true; });
            expect(called).toBe(false);
        });
    });

    describe('Conversion', () => {
        it('ok() returns Some on Ok', async () => {
            const option = await ResultAsync.ok(42).ok();
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });

        it('ok() returns None on Err', async () => {
            const option = await ResultAsync.err('error').ok();
            expect(option.is_none()).toBe(true);
        });

        it('err() returns Some on Err', async () => {
            const option = await ResultAsync.err('error').err();
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe('error');
        });

        it('err() returns None on Ok', async () => {
            const option = await ResultAsync.ok(42).err();
            expect(option.is_none()).toBe(true);
        });

        it('flatten() unwraps nested Result', async () => {
            const nested = ResultAsync.ok(Ok(42));
            const flattened = await nested.flatten();
            expect(flattened.unwrap()).toBe(42);
        });

        it('flatten() propagates outer Err', async () => {
            const nested = ResultAsync.err<Result<number, string>, string>('outer');
            const flattened = await nested.flatten();
            expect(flattened.unwrap_err()).toBe('outer');
        });

        it('flatten() propagates inner Err', async () => {
            const nested = ResultAsync.ok(Err('inner') as Result<number, string>);
            const flattened = await nested.flatten();
            expect(flattened.unwrap_err()).toBe('inner');
        });
    });

    describe('Pattern Matching', () => {
        it('match() calls Ok handler on Ok', async () => {
            const result = await ResultAsync.ok(42).match({
                Ok: v => `value: ${v}`,
                Err: e => `error: ${e}`,
            });
            expect(result).toBe('value: 42');
        });

        it('match() calls Err handler on Err', async () => {
            const result = await ResultAsync.err('failed').match({
                Ok: v => `value: ${v}`,
                Err: e => `error: ${e}`,
            });
            expect(result).toBe('error: failed');
        });

        it('match() supports async handlers', async () => {
            const result = await ResultAsync.ok(42).match({
                Ok: async v => `value: ${v}`,
                Err: async e => `error: ${e}`,
            });
            expect(result).toBe('value: 42');
        });
    });

    describe('Static Combinators', () => {
        it('all() combines all Ok results', async () => {
            const result = await ResultAsync.all([
                ResultAsync.ok(1),
                ResultAsync.ok(2),
                ResultAsync.ok(3),
            ]);
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toEqual([1, 2, 3]);
        });

        it('all() short-circuits on first Err', async () => {
            const result = await ResultAsync.all([
                ResultAsync.ok(1),
                ResultAsync.err('failed'),
                ResultAsync.ok(3),
            ]);
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toBe('failed');
        });

        it('allSettled() collects all errors', async () => {
            const result = await ResultAsync.allSettled([
                ResultAsync.ok(1),
                ResultAsync.err('first'),
                ResultAsync.err('second'),
            ]);
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toEqual(['first', 'second']);
        });

        it('allSettled() returns all values on success', async () => {
            const result = await ResultAsync.allSettled([
                ResultAsync.ok(1),
                ResultAsync.ok(2),
            ]);
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toEqual([1, 2]);
        });
    });

    describe('Type Checking', () => {
        it('isOk() returns true for Ok', async () => {
            expect(await ResultAsync.ok(42).isOk()).toBe(true);
        });

        it('isOk() returns false for Err', async () => {
            expect(await ResultAsync.err('error').isOk()).toBe(false);
        });

        it('isErr() returns true for Err', async () => {
            expect(await ResultAsync.err('error').isErr()).toBe(true);
        });

        it('isErr() returns false for Ok', async () => {
            expect(await ResultAsync.ok(42).isErr()).toBe(false);
        });
    });

    describe('toAsync() extension', () => {
        it('Ok.toAsync() returns ResultAsync', async () => {
            const result = await Ok(42).toAsync();
            expect(result.is_ok()).toBe(true);
            expect(result.unwrap()).toBe(42);
        });

        it('Err.toAsync() returns ResultAsync', async () => {
            const result = await Err('error').toAsync();
            expect(result.is_err()).toBe(true);
            expect(result.unwrap_err()).toBe('error');
        });
    });
});

describe('Utility Functions', () => {
    describe('tryAsync', () => {
        it('wraps async function to return ResultAsync', async () => {
            const safeFetch = tryAsync(async (url: string) => {
                if (url === 'good') return 'data';
                throw new Error('not found');
            });

            const ok = await safeFetch('good');
            expect(ok.is_ok()).toBe(true);
            expect(ok.unwrap()).toBe('data');

            const err = await safeFetch('bad');
            expect(err.is_err()).toBe(true);
        });
    });

    describe('liftAsync', () => {
        it('lifts sync Result function to async', async () => {
            const syncFn = (x: number): Result<number, string> =>
                x > 0 ? Ok(x * 2) : Err('negative');

            const asyncFn = liftAsync(syncFn);

            const ok = await asyncFn(5);
            expect(ok.unwrap()).toBe(10);

            const err = await asyncFn(-1);
            expect(err.unwrap_err()).toBe('negative');
        });
    });

    describe('allAsync', () => {
        it('is alias for ResultAsync.all', async () => {
            const result = await allAsync([
                ResultAsync.ok(1),
                ResultAsync.ok(2),
            ]);
            expect(result.unwrap()).toEqual([1, 2]);
        });
    });
});

describe('Complex Async Chains', () => {
    it('handles realistic API workflow', async () => {
        // Simulate API calls
        const fetchUser = (id: number) => ResultAsync.try(async () => {
            if (id === 1) return { id: 1, name: 'Alice' };
            throw new Error('User not found');
        });

        const fetchPosts = (userId: number) => ResultAsync.try(async () => {
            return [{ id: 1, title: 'Hello', userId }];
        });

        const result = await fetchUser(1)
            .andThen(user => fetchPosts(user.id)
                .map(posts => ({ user, posts }))
            );

        expect(result.is_ok()).toBe(true);
        expect(result.unwrap()).toEqual({
            user: { id: 1, name: 'Alice' },
            posts: [{ id: 1, title: 'Hello', userId: 1 }],
        });
    });

    it('handles error propagation in chain', async () => {
        const step1 = () => ResultAsync.ok(1);
        const step2 = () => ResultAsync.err<number, string>('step2 failed');
        const step3 = () => ResultAsync.ok(3);

        const result = await step1()
            .andThen(() => step2())
            .andThen(() => step3());

        expect(result.is_err()).toBe(true);
        expect(result.unwrap_err()).toBe('step2 failed');
    });

    it('handles error recovery', async () => {
        const primary = () => ResultAsync.err<string, string>('primary failed');
        const fallback = () => ResultAsync.ok('fallback data');

        const result = await primary().orElse(() => fallback());

        expect(result.is_ok()).toBe(true);
        expect(result.unwrap()).toBe('fallback data');
    });
});
