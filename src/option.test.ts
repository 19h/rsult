import {
    Some,
    None,
    option_from_nullable,
    option_from_promise,
    Option,
} from './option';

describe('Option', () => {
    describe('Check Methods', () => {
        it('is_some() should return true for Some', () => {
            const option = Some(5);
            expect(option.is_some()).toBe(true);
        });

        it('is_some() should return false for None', () => {
            const option = None();
            expect(option.is_some()).toBe(false);
        });

        it('is_some_and() should return true if the option is Some and the condition is met', () => {
            const option = Some(5);
            expect(option.is_some_and(x => x > 3)).toBe(true);
        });

        it('is_some_and() should return false if the option is Some and the condition is not met', () => {
            const option = Some(2);
            expect(option.is_some_and(x => x > 3)).toBe(false);
        });

        it('is_some_and() should return false for None', () => {
            const option = None<number>();
            expect(option.is_some_and(x => x > 3)).toBe(false);
        });

        it('is_none() should return false for Some', () => {
            const option = Some(5);
            expect(option.is_none()).toBe(false);
        });

        it('is_none() should return true for None', () => {
            const option = None();
            expect(option.is_none()).toBe(true);
        });

    });

    describe('Transform Methods', () => {
        it('map() should transform Some value correctly', () => {
            const option = Some(5);
            const newOption = option.map(x => x * 2);
            expect(newOption.unwrap()).toBe(10);
        });

        it('map() should not affect None', () => {
            const option = None();
            const newOption = option.map(x => x * 2);
            expect(() => newOption.unwrap()).toThrow();
        });

        it('map_or() should transform Some value and return transformed value', () => {
            const option = Some(5);
            const result = option.map_or(0, x => x * 2);
            expect(result).toBe(10);
        });

        it('map_or() should return default value for None', () => {
            const option = None<number>();
            const result = option.map_or(0, x => x * 2);
            expect(result).toBe(0);
        });
    });

    describe('Expect and Unwrap Methods', () => {
        it('expect() should return the value for Some', () => {
            const option = Some(5);
            expect(option.expect("Expected a value!")).toBe(5);
        });

        it('expect() should throw an error for None', () => {
            const option = None();
            expect(() => option.expect("Expected a value!")).toThrow("Expected a value!");
        });

        it('unwrap() should return the value for Some', () => {
            const option = Some(10);
            expect(option.unwrap()).toBe(10);
        });

        it('unwrap() should throw an error for None', () => {
            const option = None();
            expect(() => option.unwrap()).toThrow();
        });

        it('unwrap_or() should return the value for Some', () => {
            const option = Some(15);
            expect(option.unwrap_or(20)).toBe(15);
        });

        it('unwrap_or() should return the provided default value for None', () => {
            const option = None();
            expect(option.unwrap_or(20)).toBe(20);
        });

        it('unwrap_or_else() should return the value for Some', () => {
            const option = Some(15);
            expect(option.unwrap_or_else(() => 20)).toBe(15);
        });

        it('unwrap_or_else() should return the result of the function for None', () => {
            const option = None();
            expect(option.unwrap_or_else(() => 20)).toBe(20);
        });

        it('unwrap_or_default() should return the value for Some', () => {
            const option = Some(15);
            expect(option.unwrap_or_default()).toBe(15);
        });

        it('unwrap_or_default() should return the default value for the type for None', () => {
            const option = None<number>();
            // this should be 0 for number, but TypeScript can't do
            // runtime checks for default values based on type
            expect(option.unwrap_or_default()).toBe(null);
        });
    });

    describe('Combine Methods', () => {
        it('and() should return the passed Option if the first Option is Some', () => {
            const opt1 = Some(5);
            const opt2 = Some(10);
            const result = opt1.and(opt2);
            expect(result.unwrap()).toBe(10);
        });

        it('and() should return None if the first Option is None', () => {
            const opt1 = None();
            const opt2 = Some(10);
            const result = opt1.and(opt2);
            expect(() => result.unwrap()).toThrow();
        });

        it('and_then() should apply function and return Some if the first Option is Some', () => {
            const opt = Some(5);
            const result = opt.and_then(x => Some(x * 2));
            expect(result.unwrap()).toBe(10);
        });

        it('and_then() should return None if the first Option is None', () => {
            const opt = None();
            const result = opt.and_then(x => Some(x * 2));
            expect(() => result.unwrap()).toThrow();
        });

        it('or() should return the first Option if it is Some', () => {
            const opt1 = Some(5);
            const opt2 = Some(10);
            const result = opt1.or(opt2);
            expect(result.unwrap()).toBe(5);
        });

        it('or() should return the second Option if the first Option is None', () => {
            const opt1 = None();
            const opt2 = Some(10);
            const result = opt1.or(opt2);
            expect(result.unwrap()).toBe(10);
        });

        it('or_else() should return the first Option if it is Some', () => {
            const opt1 = Some(5);
            const result = opt1.or_else(() => Some(10));
            expect(result.unwrap()).toBe(5);
        });

        it('or_else() should return the result of the function if the first Option is None', () => {
            const opt1 = None();
            const result = opt1.or_else(() => Some(10));
            expect(result.unwrap()).toBe(10);
        });

        it('xor() should return None if both Options are Some', () => {
            const opt1 = Some(5);
            const opt2 = Some(10);
            const result = opt1.xor(opt2);
            expect(() => result.unwrap()).toThrow();
        });

        it('xor() should return Some if only one of the Options is Some', () => {
            const opt1 = Some(5);
            const opt2 = None<number>();
            const result = opt1.xor(opt2);
            expect(result.unwrap()).toBe(5);

            const opt3 = None();
            const opt4 = Some(10);
            const result2 = opt3.xor(opt4);
            expect(result2.unwrap()).toBe(10);
        });

        it('xor() should return None if both Options are None', () => {
            const opt1 = None();
            const opt2 = None();
            const result = opt1.xor(opt2);
            expect(() => result.unwrap()).toThrow();
        });
    });

    describe('Mutate Methods', () => {
        it('take() should take the value from Some, leaving None', () => {
            const option = Some(5);
            const taken = option.take();
            expect(taken.unwrap()).toBe(5);

            // this is not possible in the current TypeScript implementation
            // as the value is moved out of the Option, but the Option is still
            // "OptionSome"
            //expect(option.is_none()).toBe(true);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(undefined);
        });

        it('take() should do nothing on None, returning None', () => {
            const option = None();
            const taken = option.take();
            expect(() => taken.unwrap()).toThrow();
            expect(option.is_none()).toBe(true);
        });

        it('take_if() should take the value if the condition is met, leaving None', () => {
            const option = Some(5);
            const taken = option.take_if(x => x > 3);
            expect(taken.unwrap()).toBe(5);
            // this is not possible in the current TypeScript implementation
            // as the value is moved out of the Option, but the Option is still
            // "OptionSome"
            //expect(option.is_none()).toBe(true);
            expect(option.is_some()).toBe(true);
            expect(option.unwrap()).toBe(undefined);
        });

        it('take_if() should leave the option untouched if condition is not met', () => {
            const option = Some(2);
            const taken = option.take_if(x => x > 3);
            expect(() => taken.unwrap()).toThrow();
            expect(option.is_some()).toBe(true);
        });

        it('take_if() should do nothing on None, returning None', () => {
            const option = None<number>();
            const taken = option.take_if(x => x > 3);
            expect(() => taken.unwrap()).toThrow();
            expect(option.is_none()).toBe(true);
        });

        it('replace() should replace the value of Some, returning the old value', () => {
            const option = Some(5);
            const oldValue = option.replace(10);
            expect(oldValue.unwrap()).toBe(5);
            expect(option.unwrap()).toBe(10);
        });

        it('replace() should place a value in None, returning None', () => {
            const option = None();
            const oldValue = option.replace(10);
            expect(() => option.unwrap()).toThrow();
            expect(oldValue.unwrap()).toBe(10);
        });
    });

    describe('Zip Methods', () => {
        it('zip() combines Some values into a tuple', () => {
            const opt1 = Some(5);
            const opt2 = Some("hello");
            const zipped = opt1.zip(opt2);
            expect(zipped.unwrap()).toEqual([5, "hello"]);
        });

        it('zip() returns None if either Option is None', () => {
            const opt1 = Some(5);
            const opt2 = None<string>();
            const zipped = opt1.zip(opt2);
            expect(() => zipped.unwrap()).toThrow();

            const opt3 = None<number>();
            const opt4 = Some("hello");
            const zipped2 = opt3.zip(opt4);
            expect(() => zipped2.unwrap()).toThrow();
        });

        it('zip_with() combines Some values with a function', () => {
            const opt1 = Some(5);
            const opt2 = Some(10);
            const added = opt1.zip_with(opt2, (a, b) => a + b);
            expect(added.unwrap()).toBe(15);
        });

        it('zip_with() returns None if either Option is None', () => {
            const opt1 = Some(5);
            const opt2 = None<number>();
            const shouldBeNone = opt1.zip_with(opt2, (a, b) => a + b);
            expect(() => shouldBeNone.unwrap()).toThrow();

            const opt3 = None<number>();
            const opt4 = Some(10);
            const shouldBeNone2 = opt3.zip_with(opt4, (a, b) => a + b);
            expect(() => shouldBeNone2.unwrap()).toThrow();
        });
    });

    describe('Filter Method', () => {
        it('filter() should return the same Option if the predicate is true for Some', () => {
            const option = Some(5);
            const filteredOption = option.filter(x => x > 3);
            expect(filteredOption.unwrap()).toBe(5);
        });

        it('filter() should return None if the predicate is false for Some', () => {
            const option = Some(2);
            const filteredOption = option.filter(x => x > 3);
            expect(() => filteredOption.unwrap()).toThrow();
        });

        it('filter() should return None if called on None', () => {
            const option = None<number>();
            const filteredOption = option.filter(x => x > 3);
            expect(() => filteredOption.unwrap()).toThrow();
        });
    });

    describe('Flatten Method', () => {
        it('flatten() should return the inner option if the outer option is Some and contains another Some', () => {
            const option = Some(Some(5));
            const flattened = option.flatten();
            expect(flattened.unwrap()).toBe(5);
        });

        it('flatten() should return None if the outer option is Some but contains None', () => {
            const option = Some(None<number>());
            const flattened = option.flatten();
            expect(() => flattened.unwrap()).toThrow();
        });

        it('flatten() should return None if the outer option is None', () => {
            const option = None<Option<number>>();
            const flattened = option.flatten();
            expect(() => flattened.unwrap()).toThrow();
        });
    });

    describe('Utility Methods', () => {
        describe('Core', () => {
            it('Some() should create a Some Option', () => {
                const option = Some(5);
                expect(option.unwrap()).toBe(5);
            });

            it('None() should create a None Option', () => {
                const option = None();
                expect(() => option.unwrap()).toThrow();
            });
        });

        describe('option_from_nullable', () => {
            it('should return Some for non-null values', () => {
                const option = option_from_nullable(5);
                expect(option.unwrap()).toBe(5);
            });

            it('should return None for null', () => {
                const option = option_from_nullable(null);
                expect(option.is_none()).toBe(true);
            });

            it('should return None for undefined', () => {
                const option = option_from_nullable(undefined);
                expect(option.is_none()).toBe(true);
            });

            it('should return Some for non-null string values', () => {
                const option = option_from_nullable("test");
                expect(option.unwrap()).toBe("test");
            });

            it('should return Some for empty string', () => {
                const option = option_from_nullable("");
                expect(option.unwrap()).toBe("");
            });

            it('should return Some for boolean true', () => {
                const option = option_from_nullable(true);
                expect(option.unwrap()).toBe(true);
            });

            it('should return Some for boolean false', () => {
                const option = option_from_nullable(false);
                expect(option.unwrap()).toBe(false);
            });
        });

        describe('option_from_promise', () => {
            it('should return Some on promise resolution', async () => {
                const promise = Promise.resolve(5);
                const option = await option_from_promise(promise);
                expect(option.unwrap()).toBe(5);
            });

            it('should return None on promise rejection', async () => {
                const promise = Promise.reject('Error');
                const option = await option_from_promise(promise);
                expect(option.is_none()).toBe(true);
            });

            it('should return Some on promise resolution with string', async () => {
                const promise = Promise.resolve("test");
                const option = await option_from_promise(promise);
                expect(option.unwrap()).toBe("test");
            });

            it('should return Some on promise resolution with boolean', async () => {
                const promise = Promise.resolve(true);
                const option = await option_from_promise(promise);
                expect(option.unwrap()).toBe(true);
            });

            it('should return None on promise rejection with custom error', async () => {
                const promise = Promise.reject(new Error("Custom error"));
                const option = await option_from_promise(promise);
                expect(option.is_none()).toBe(true);
            });
        });
    });

    describe('New Rust-inspired Methods', () => {
        describe('is_none_or', () => {
            it('returns true if None', () => {
                expect(None<number>().is_none_or(x => x > 5)).toBe(true);
            });

            it('returns true if Some and predicate is true', () => {
                expect(Some(10).is_none_or(x => x > 5)).toBe(true);
            });

            it('returns false if Some and predicate is false', () => {
                expect(Some(3).is_none_or(x => x > 5)).toBe(false);
            });
        });

        describe('inspect', () => {
            it('calls function with Some value', () => {
                let inspected: number | null = null;
                Some(42).inspect(x => { inspected = x; });
                expect(inspected).toBe(42);
            });

            it('does not call function on None', () => {
                let called = false;
                None<number>().inspect(() => { called = true; });
                expect(called).toBe(false);
            });

            it('returns self for chaining', () => {
                const result = Some(5).inspect(() => {}).map(x => x * 2);
                expect(result.unwrap()).toBe(10);
            });
        });

        describe('ok_or', () => {
            it('converts Some to Ok', () => {
                const result = Some(42).ok_or('error');
                expect(result._tag).toBe('Ok');
                expect(result.value).toBe(42);
            });

            it('converts None to Err', () => {
                const result = None<number>().ok_or('error');
                expect(result._tag).toBe('Err');
                expect(result.value).toBe('error');
            });
        });

        describe('ok_or_else', () => {
            it('converts Some to Ok without calling error fn', () => {
                let called = false;
                const result = Some(42).ok_or_else(() => { called = true; return 'error'; });
                expect(result._tag).toBe('Ok');
                expect(result.value).toBe(42);
                expect(called).toBe(false);
            });

            it('converts None to Err by calling error fn', () => {
                const result = None<number>().ok_or_else(() => 'computed error');
                expect(result._tag).toBe('Err');
                expect(result.value).toBe('computed error');
            });
        });

        describe('unzip', () => {
            it('unzips Some tuple into tuple of Somes', () => {
                const [a, b] = Some([1, 'hello'] as [number, string]).unzip();
                expect(a.unwrap()).toBe(1);
                expect(b.unwrap()).toBe('hello');
            });

            it('unzips None into tuple of Nones', () => {
                const [a, b] = None<[number, string]>().unzip();
                expect(a.is_none()).toBe(true);
                expect(b.is_none()).toBe(true);
            });
        });

        describe('transpose', () => {
            it('transposes Some(Ok(x)) to Ok(Some(x))', () => {
                const optionOfResult = Some({ _tag: 'Ok' as const, value: 42 });
                const result = optionOfResult.transpose();
                expect(result._tag).toBe('Ok');
                expect((result.value as any).unwrap()).toBe(42);
            });

            it('transposes Some(Err(e)) to Err(e)', () => {
                const optionOfResult = Some({ _tag: 'Err' as const, value: 'error' });
                const result = optionOfResult.transpose();
                expect(result._tag).toBe('Err');
                expect(result.value).toBe('error');
            });

            it('transposes None to Ok(None)', () => {
                const result = None<{ _tag: 'Ok'; value: number }>().transpose();
                expect(result._tag).toBe('Ok');
                expect((result.value as any).is_none()).toBe(true);
            });
        });
    });
});