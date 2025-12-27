import { OptionAsync } from './option-async';
import { Option, Some, None } from './option';

describe('OptionAsync', () => {
    describe('Constructors', () => {
        it('some() creates OptionAsync with value', async () => {
            const option = await OptionAsync.some(42);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });

        it('none() creates empty OptionAsync', async () => {
            const option = await OptionAsync.none<number>();
            expect(option.is_none()).toBe(true);
        });

        it('fromOption() wraps sync Option', async () => {
            const option = await OptionAsync.fromOption(Some(42));
            expect(option.unwrap()).toBe(42);
        });

        it('fromOption() wraps Promise<Option>', async () => {
            const option = await OptionAsync.fromOption(Promise.resolve(Some(42)));
            expect(option.unwrap()).toBe(42);
        });

        it('fromPromise() converts resolved promise to Some', async () => {
            const option = await OptionAsync.fromPromise(Promise.resolve(42));
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });

        it('fromPromise() converts rejected promise to None', async () => {
            const option = await OptionAsync.fromPromise(Promise.reject(new Error('failed')));
            expect(option.is_none()).toBe(true);
        });

        it('fromNullable() returns Some for non-null', async () => {
            const option = await OptionAsync.fromNullable(42);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });

        it('fromNullable() returns None for null', async () => {
            const option = await OptionAsync.fromNullable(null);
            expect(option.is_none()).toBe(true);
        });

        it('fromNullable() returns None for undefined', async () => {
            const option = await OptionAsync.fromNullable(undefined);
            expect(option.is_none()).toBe(true);
        });

        it('try() catches errors and returns None', async () => {
            const option = await OptionAsync.try(async () => {
                throw new Error('failed');
            });
            expect(option.is_none()).toBe(true);
        });

        it('try() returns Some on success', async () => {
            const option = await OptionAsync.try(async () => 42);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });
    });

    describe('Transformations', () => {
        it('map() transforms Some value with sync function', async () => {
            const option = await OptionAsync.some(5).map(x => x * 2);
            expect(option.unwrap()).toBe(10);
        });

        it('map() transforms Some value with async function', async () => {
            const option = await OptionAsync.some(5).map(async x => x * 2);
            expect(option.unwrap()).toBe(10);
        });

        it('map() skips transformation on None', async () => {
            const option = await OptionAsync.none<number>().map(x => x * 2);
            expect(option.is_none()).toBe(true);
        });

        it('mapOr() returns mapped value on Some', async () => {
            const value = await OptionAsync.some(5).mapOr(0, x => x * 2);
            expect(value).toBe(10);
        });

        it('mapOr() returns default on None', async () => {
            const value = await OptionAsync.none<number>().mapOr(0, x => x * 2);
            expect(value).toBe(0);
        });

        it('mapOrElse() computes default on None', async () => {
            const value = await OptionAsync.none<number>().mapOrElse(
                () => 99,
                x => x * 2
            );
            expect(value).toBe(99);
        });
    });

    describe('Chaining', () => {
        it('andThen() chains sync Option', async () => {
            const option = await OptionAsync.some(5)
                .andThen(x => Some(x * 2));
            expect(option.unwrap()).toBe(10);
        });

        it('andThen() chains OptionAsync', async () => {
            const option = await OptionAsync.some(5)
                .andThen(x => OptionAsync.some(x * 2));
            expect(option.unwrap()).toBe(10);
        });

        it('andThen() propagates None', async () => {
            const option = await OptionAsync.some(5)
                .andThen(x => None<number>());
            expect(option.is_none()).toBe(true);
        });

        it('andThen() skips on initial None', async () => {
            let called = false;
            const option = await OptionAsync.none<number>()
                .andThen(x => {
                    called = true;
                    return Some(x * 2);
                });
            expect(called).toBe(false);
            expect(option.is_none()).toBe(true);
        });

        it('orElse() provides fallback on None', async () => {
            const option = await OptionAsync.none<number>()
                .orElse(() => Some(42));
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });

        it('orElse() skips on Some', async () => {
            let called = false;
            const option = await OptionAsync.some(42)
                .orElse(() => {
                    called = true;
                    return Some(0);
                });
            expect(called).toBe(false);
            expect(option.unwrap()).toBe(42);
        });

        it('and() returns other on Some', async () => {
            const option = await OptionAsync.some(1).and(OptionAsync.some('hello'));
            expect(option.unwrap()).toBe('hello');
        });

        it('and() returns None on initial None', async () => {
            const option = await OptionAsync.none<number>()
                .and(OptionAsync.some('hello'));
            expect(option.is_none()).toBe(true);
        });

        it('or() returns self on Some', async () => {
            const option = await OptionAsync.some(42).or(OptionAsync.some(0));
            expect(option.unwrap()).toBe(42);
        });

        it('or() returns other on None', async () => {
            const option = await OptionAsync.none<number>().or(OptionAsync.some(0));
            expect(option.unwrap()).toBe(0);
        });
    });

    describe('Filtering', () => {
        it('filter() keeps matching values', async () => {
            const option = await OptionAsync.some(10).filter(x => x > 5);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(10);
        });

        it('filter() removes non-matching values', async () => {
            const option = await OptionAsync.some(3).filter(x => x > 5);
            expect(option.is_none()).toBe(true);
        });

        it('filter() skips on None', async () => {
            const option = await OptionAsync.none<number>().filter(x => x > 5);
            expect(option.is_none()).toBe(true);
        });

        it('filter() supports async predicate', async () => {
            const option = await OptionAsync.some(10).filter(async x => x > 5);
            expect(option.is_some()).toBe(true);
        });
    });

    describe('Unwrapping', () => {
        it('expect() returns value on Some', async () => {
            const value = await OptionAsync.some(42).expect('should not fail');
            expect(value).toBe(42);
        });

        it('expect() throws on None', async () => {
            await expect(OptionAsync.none().expect('custom message'))
                .rejects.toThrow('custom message');
        });

        it('unwrap() returns value on Some', async () => {
            const value = await OptionAsync.some(42).unwrap();
            expect(value).toBe(42);
        });

        it('unwrap() throws on None', async () => {
            await expect(OptionAsync.none().unwrap()).rejects.toThrow();
        });

        it('unwrapOr() returns value on Some', async () => {
            const value = await OptionAsync.some(42).unwrapOr(0);
            expect(value).toBe(42);
        });

        it('unwrapOr() returns default on None', async () => {
            const value = await OptionAsync.none<number>().unwrapOr(0);
            expect(value).toBe(0);
        });

        it('unwrapOrElse() computes default on None', async () => {
            const value = await OptionAsync.none<number>().unwrapOrElse(() => 99);
            expect(value).toBe(99);
        });
    });

    describe('Inspection', () => {
        it('inspect() calls function on Some', async () => {
            let inspected: number | null = null;
            await OptionAsync.some(42).inspect(x => { inspected = x; });
            expect(inspected).toBe(42);
        });

        it('inspect() skips on None', async () => {
            let called = false;
            await OptionAsync.none<number>().inspect(() => { called = true; });
            expect(called).toBe(false);
        });
    });

    describe('Conversion', () => {
        it('flatten() unwraps nested Option', async () => {
            const nested = OptionAsync.some(Some(42));
            const flattened = await nested.flatten();
            expect(flattened.unwrap()).toBe(42);
        });

        it('flatten() propagates outer None', async () => {
            const nested = OptionAsync.none<Option<number>>();
            const flattened = await nested.flatten();
            expect(flattened.is_none()).toBe(true);
        });

        it('flatten() propagates inner None', async () => {
            const nested = OptionAsync.some(None<number>());
            const flattened = await nested.flatten();
            expect(flattened.is_none()).toBe(true);
        });

        it('zip() combines two Some values', async () => {
            const zipped = await OptionAsync.some(1).zip(OptionAsync.some('a'));
            expect(zipped.unwrap()).toEqual([1, 'a']);
        });

        it('zip() returns None if first is None', async () => {
            const zipped = await OptionAsync.none<number>().zip(OptionAsync.some('a'));
            expect(zipped.is_none()).toBe(true);
        });

        it('zip() returns None if second is None', async () => {
            const zipped = await OptionAsync.some(1).zip(OptionAsync.none<string>());
            expect(zipped.is_none()).toBe(true);
        });

        it('zipWith() applies function to zipped values', async () => {
            const result = await OptionAsync.some(2)
                .zipWith(OptionAsync.some(3), (a, b) => a + b);
            expect(result.unwrap()).toBe(5);
        });
    });

    describe('Pattern Matching', () => {
        it('match() calls Some handler on Some', async () => {
            const result = await OptionAsync.some(42).match({
                Some: v => `value: ${v}`,
                None: () => 'empty',
            });
            expect(result).toBe('value: 42');
        });

        it('match() calls None handler on None', async () => {
            const result = await OptionAsync.none().match({
                Some: v => `value: ${v}`,
                None: () => 'empty',
            });
            expect(result).toBe('empty');
        });

        it('match() supports async handlers', async () => {
            const result = await OptionAsync.some(42).match({
                Some: async v => `value: ${v}`,
                None: async () => 'empty',
            });
            expect(result).toBe('value: 42');
        });
    });

    describe('Static Combinators', () => {
        it('all() combines all Some options', async () => {
            const option = await OptionAsync.all([
                OptionAsync.some(1),
                OptionAsync.some(2),
                OptionAsync.some(3),
            ]);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toEqual([1, 2, 3]);
        });

        it('all() returns None if any is None', async () => {
            const option = await OptionAsync.all([
                OptionAsync.some(1),
                OptionAsync.none<number>(),
                OptionAsync.some(3),
            ]);
            expect(option.is_none()).toBe(true);
        });
    });

    describe('Type Checking', () => {
        it('isSome() returns true for Some', async () => {
            expect(await OptionAsync.some(42).isSome()).toBe(true);
        });

        it('isSome() returns false for None', async () => {
            expect(await OptionAsync.none().isSome()).toBe(false);
        });

        it('isNone() returns true for None', async () => {
            expect(await OptionAsync.none().isNone()).toBe(true);
        });

        it('isNone() returns false for Some', async () => {
            expect(await OptionAsync.some(42).isNone()).toBe(false);
        });
    });

    describe('toAsync() extension', () => {
        it('Some.toAsync() returns OptionAsync', async () => {
            const option = await Some(42).toAsync();
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(42);
        });

        it('None.toAsync() returns OptionAsync', async () => {
            const option = await None().toAsync();
            expect(option.is_none()).toBe(true);
        });
    });
});

describe('Complex Async Chains', () => {
    it('handles realistic optional data flow', async () => {
        const findUser = (id: number) => OptionAsync.try(async () => {
            if (id === 1) return { id: 1, name: 'Alice', profileId: 100 };
            throw new Error('not found');
        });

        const findProfile = (profileId: number) => OptionAsync.try(async () => {
            return { id: profileId, bio: 'Hello!' };
        });

        const result = await findUser(1)
            .andThen(user => findProfile(user.profileId)
                .map(profile => ({ ...user, profile }))
            );

        expect(result.is_some()).toBe(true);
        expect(result.unwrap()).toEqual({
            id: 1,
            name: 'Alice',
            profileId: 100,
            profile: { id: 100, bio: 'Hello!' },
        });
    });

    it('handles None propagation', async () => {
        const result = await OptionAsync.some(5)
            .andThen(() => OptionAsync.none<number>())
            .map(x => x * 2);

        expect(result.is_none()).toBe(true);
    });

    it('handles fallback chains', async () => {
        const primary = () => OptionAsync.none<string>();
        const secondary = () => OptionAsync.none<string>();
        const fallback = () => OptionAsync.some('default');

        const result = await primary()
            .orElse(() => secondary())
            .orElse(() => fallback());

        expect(result.unwrap()).toBe('default');
    });
});
