import {
    Err,
    Ok,
    Result,
    result_from_promise,
    try_catch,
    ResultOk,
    ResultErr,
    isResultOk,
    isResultErr,
} from './result';

describe('Result', () => {
    describe('IResultCore', () => {
        it('is_ok returns true for ResultOk', () => {
            const result = Ok(5);
            expect(result.is_ok()).toBe(true);
        });

        it('is_ok returns false for ResultErr', () => {
            const result = Err(new Error("Error"));
            expect(result.is_ok()).toBe(false);
        });

        it('is_err returns true for ResultErr', () => {
            const result = Err(new Error("Error"));
            expect(result.is_err()).toBe(true);
        });

        it('is_err returns false for ResultOk', () => {
            const result = Ok(5);
            expect(result.is_err()).toBe(false);
        });

        it('ok returns Some for ResultOk', () => {
            const result = Ok(5);
            expect(result.ok().is_some()).toBe(true);
            expect(result.ok().unwrap()).toBe(5);
        });

        it('ok returns None for ResultErr', () => {
            const result = Err(new Error("Error"));
            expect(result.ok().is_none()).toBe(true);
        });

        it('err returns Some for ResultErr', () => {
            const result = Err(new Error("Error"));
            expect(result.err().is_some()).toBe(true);
            expect(result.err().unwrap()).toEqual(new Error("Error"));
        });

        it('err returns None for ResultOk', () => {
            const result = Ok(5);
            expect(result.err().is_none()).toBe(true);
        });

        it('expect returns value for ResultOk', () => {
            const result = Ok(5);
            expect(result.expect("This should not fail")).toBe(5);
        });

        it('expect throws for ResultErr', () => {
            const result = Err("This will fail");
            expect(() => result.expect("This should not fail")).toThrow("This should not fail");
        });

        it('unwrap returns value for ResultOk', () => {
            const result = Ok(5);
            expect(result.unwrap()).toBe(5);
        });

        it('unwrap throws for ResultErr', () => {
            const result = Err(new Error("Failure"));
            expect(() => result.unwrap()).toThrow();
            expect(result.unwrap_err().message).toBe("Failure");
        });

        it('expect_err returns error for ResultErr', () => {
            const result = Err(new Error("Failure"));
            expect(result.expect_err("Expected an error")).toEqual(new Error("Failure"));
        });

        it('expect_err throws for ResultOk', () => {
            const result = Ok(5);
            expect(() => result.expect_err("Expected an error")).toThrow("Expected an error");
        });

        it('unwrap_err returns error for ResultErr', () => {
            const result = Err(new Error("Failure"));
            expect(result.unwrap_err()).toEqual(new Error("Failure"));
        });

        it('unwrap_err throws for ResultOk', () => {
            const result = Ok(5);
            expect(() => result.unwrap_err()).toThrow();
        });

        it('into_ok returns value for ResultOk', () => {
            const result = Ok(5);
            expect(result.into_ok()).toBe(5);
        });

        it('into_ok throws for ResultErr', () => {
            const result = Err(new Error("Failure"));
            expect(() => result.into_ok()).toThrow();
        });

        it('into_err returns error for ResultErr', () => {
            const result = Err(new Error("Failure"));
            expect(result.into_err()).toEqual(new Error("Failure"));
        });

        it('into_err throws for ResultOk', () => {
            const result = Ok(5);
            expect(() => result.into_err()).toThrow();
        });
    });

    describe('IResultExt', () => {
        describe('is_ok_and', () => {
            it('returns true if result is Ok and condition is met', () => {
                const result = Ok(5);
                expect(result.is_ok_and(x => x > 3)).toBe(true);
            });

            it('returns false if result is Ok and condition is not met', () => {
                const result = Ok(2);
                expect(result.is_ok_and(x => x > 3)).toBe(false);
            });

            it('returns false if result is Err', () => {
                const result = Err(new Error("Error"));
                expect(result.is_ok_and(x => x > 3)).toBe(false);
            });
        });

        describe('is_err_and', () => {
            it('returns true if result is Err and condition is met', () => {
                const result = Err(new Error("Network failure"));
                expect(result.is_err_and(e => e.message.includes("Network"))).toBe(true);
            });

            it('returns false if result is Err and condition is not met', () => {
                const result = Err(new Error("Other error"));
                expect(result.is_err_and(e => e.message.includes("Network"))).toBe(false);
            });

            it('returns false if result is Ok', () => {
                const result = Ok(5);
                expect(result.is_err_and(e => true)).toBe(false);
            });
        });

        describe('map', () => {
            it('transforms Ok value', () => {
                const result = Ok(5);
                const mapped = result.map(x => x * 2);
                expect(mapped.unwrap()).toBe(10);
            });

            it('does not transform Err value', () => {
                const result = Err("Error");
                const mapped = result.map(x => x * 2);
                expect(mapped.is_err()).toBe(true);
            });
        });

        describe('map_or', () => {
            it('transforms Ok value and returns it', () => {
                const result = Ok(5);
                const value = result.map_or(0, x => x * 2);
                expect(value).toBe(10);
            });

            it('returns default value for Err', () => {
                const result = Err("Error");
                const value = result.map_or(0, x => x * 2);
                expect(value).toBe(0);
            });
        });

        describe('map_or_else', () => {
            it('transforms Ok value and returns it', () => {
                const result = Ok(5);
                const value = result.map_or_else(() => 0, x => x * 2);
                expect(value).toBe(10);
            });

            it('computes and returns default value for Err', () => {
                const result = Err("Error");
                const value = result.map_or_else(() => 0, x => x * 2);
                expect(value).toBe(0);
            });
        });

        describe('map_err', () => {
            it('transforms Err value', () => {
                const result = Err("Error");
                const mappedErr = result.map_err(e => new Error(e));
                expect(mappedErr.unwrap_err().message).toBe("Error");
            });

            it('does not transform Ok value', () => {
                const result = Ok(5) as Result<number, Error>;
                const mapped = result.map_err((e) => new Error(e.toString()));
                expect(mapped.is_ok()).toBe(true);
            });
        });

        describe('inspect', () => {
            it('applies function to Ok value and returns unmodified Result', () => {
                const result = Ok(5);
                const inspectSpy = jest.fn();
                result.inspect(inspectSpy);
                expect(inspectSpy).toHaveBeenCalledWith(5);
                expect(result.unwrap()).toBe(5);
            });

            it('does not apply function to Err value', () => {
                const result = Err("Error");
                const inspectSpy = jest.fn();
                result.inspect(inspectSpy);
                expect(inspectSpy).not.toHaveBeenCalled();
            });
        });

        describe('inspect_err', () => {
            it('applies function to Err value and returns unmodified Result', () => {
                const result = Err(new Error("Error"));
                const inspectSpy = jest.fn();
                result.inspect_err(inspectSpy);
                expect(inspectSpy).toHaveBeenCalledWith(new Error("Error"));
            });

            it('does not apply function to Ok value', () => {
                const result = Ok(5);
                const inspectSpy = jest.fn();
                result.inspect_err(inspectSpy);
                expect(inspectSpy).not.toHaveBeenCalled();
            });
        });

        describe('and', () => {
            it('returns other if result is Ok', () => {
                const result = Ok(5);
                const other = Ok("Hello");
                const finalResult = result.and(other);
                expect(finalResult.unwrap()).toBe("Hello");
            });

            it('returns original Err if result is Err', () => {
                const result = Err("Error");
                const other = Ok(5);
                const finalResult = result.and(other);
                expect(finalResult.is_err()).toBe(true);
            });
        });

        describe('and_then', () => {
            it('applies function if result is Ok', () => {
                const result = Ok(5);
                const finalResult = result.and_then(x => Ok(x * 2));
                expect(finalResult.unwrap()).toBe(10);
            });

            it('returns original Err if result is Err', () => {
                const result = Err("Error");
                const finalResult = result.and_then(x => Ok(x * 2));
                expect(finalResult.is_err()).toBe(true);
            });
        });

        describe('or', () => {
            it('returns original Ok if result is Ok', () => {
                const result = Ok(5) as Result<number, string>;
                const other = Err("Alternate Error");
                const finalResult = result.or(other);
                expect(finalResult.unwrap()).toBe(5);
            });

            it('returns other if result is Err', () => {
                const result = Err("Error");
                const other = Ok(5);
                const finalResult = result.or(other);
                expect(finalResult.unwrap()).toBe(5);
            });
        });

        describe('or_else', () => {
            it('returns original Ok if result is Ok', () => {
                const result = Ok(5) as Result<number, Error>;
                const finalResult = result.or_else(e => Err(e.message + "handled"));
                expect(finalResult.unwrap()).toBe(5);
            });

            it('applies function if result is Err', () => {
                const result = Err("Error") as Result<string, string>;
                const finalResult = result.or_else(e => Ok(`Handled ${e}`));
                expect(finalResult.unwrap()).toBe("Handled Error");
            });
        });

        describe('unwrap_or', () => {
            it('returns Ok value for ResultOk', () => {
                const result = Ok(5);
                expect(result.unwrap_or(0)).toBe(5);
            });

            it('returns default value for ResultErr', () => {
                const result = Err("Error") as Result<number, string>;
                expect(result.unwrap_or(0)).toBe(0);
            });
        });

        describe('unwrap_or_else', () => {
            it('returns Ok value for ResultOk', () => {
                const result = Ok(5);
                expect(result.unwrap_or_else(() => 0)).toBe(5);
            });

            it('computes and returns default value for ResultErr', () => {
                const result = Err("Error") as Result<number, string>;
                expect(result.unwrap_or_else(() => 0)).toBe(0);
            });
        });
    });


    describe('IResultIteration', () => {
        describe('iter', () => {
            it('yields contained value for ResultOk', () => {
                const result = Ok(5);
                const values = Array.from(result.iter());
                expect(values).toEqual([5]);
            });

            it('yields nothing for ResultErr', () => {
                const result = Err(new Error("Error"));
                const values = Array.from(result.iter());
                expect(values).toEqual([]);
            });
        });

        describe('flatten', () => {
            it('flattens nested Ok Result', () => {
                const nestedOk = Ok(Ok(5));
                const flattened = nestedOk.flatten();
                expect(flattened).toEqual(Ok(5));
            });

            it('flattens ResultOk containing ResultErr', () => {
                const nestedErr = Ok(Err(new Error("error")));
                const flattenedError = nestedErr.flatten();
                expect(flattenedError).toEqual(Err(new Error("error")));
            });

            it('returns self if not nested', () => {
                const resultOk = Ok(5);
                const flattenedOk = resultOk.flatten();
                expect(flattenedOk).toEqual(Ok(5));

                const resultErr = Err(new Error("error"));
                const flattenedErr = resultErr.flatten();
                expect(flattenedErr).toEqual(Err(new Error("error")));
            });
        });
    });

    describe('Utility Methods', () => {
        class MyOk<T> extends ResultOk<T, any> { }
        class MyErr<E> extends ResultErr<any, E> { }

        describe('isResultOk', () => {
            it('returns true if value is an instance of ResultOk', () => {
                const result = new MyOk<number>(5);
                expect(isResultOk<number, Error>(result)).toBe(true);
            });

            it('returns false if value is not an instance of ResultOk', () => {
                const errorResult = new MyErr<Error>(new Error("Error"));
                expect(isResultOk<number, Error>(errorResult)).toBe(false);
            });

            it('returns false for non-Result values', () => {
                expect(isResultOk<number, Error>(5)).toBe(false);
                expect(isResultOk<number, Error>("test")).toBe(false);
                expect(isResultOk<number, Error>(null)).toBe(false);
                expect(isResultOk<number, Error>(undefined)).toBe(false);
            });
        });

        describe('isResultErr', () => {
            it('returns true if value is an instance of ResultErr', () => {
                const errorResult = new MyErr<Error>(new Error("Error"));
                expect(isResultErr<number, Error>(errorResult)).toBe(true);
            });

            it('returns false if value is not an instance of ResultErr', () => {
                const result = new MyOk<number>(5);
                expect(isResultErr<number, Error>(result)).toBe(false);
            });

            it('returns false for non-Result values', () => {
                expect(isResultErr<number, Error>(5)).toBe(false);
                expect(isResultErr<number, Error>("test")).toBe(false);
                expect(isResultErr<number, Error>(null)).toBe(false);
                expect(isResultErr<number, Error>(undefined)).toBe(false);
            });
        });

        describe('try_catch function', () => {
            it('should return Ok result for successful function execution', () => {
                const result = try_catch(() => 42);
                expect(result.is_ok()).toBe(true);
                expect(result.unwrap()).toBe(42);
            });

            it('should return Err result for function that throws', () => {
                const errorMsg = 'Error occurred';
                const result = try_catch(() => {
                    throw new Error(errorMsg);
                });
                expect(result.is_err()).toBe(true);
                expect(result.unwrap_err().message).toBe(errorMsg);
            });
        });

        describe('result_from_promise function', () => {
            it('should return Ok result for resolved promise', async () => {
                const promise = Promise.resolve(42);
                const result = await result_from_promise(promise);
                expect(result.is_ok()).toBe(true);
                expect(result.unwrap()).toBe(42);
            });

            it('should return Err result for rejected promise', async () => {
                const errorMsg = 'Promise rejected';
                const promise = Promise.reject(new Error(errorMsg));
                const result = await result_from_promise(promise);
                expect(result.is_err()).toBe(true);
                expect(result.unwrap_err().message).toBe(errorMsg);
            });
        });
    });

    describe('New Rust-inspired Methods', () => {
        describe('transpose', () => {
            it('transposes Ok(Some(v)) to Some(Ok(v))', () => {
                const { Some } = require('./option');
                const result = Ok(Some(42));
                const transposed = result.transpose();
                expect(transposed.is_some()).toBe(true);
                expect(transposed.unwrap().is_ok()).toBe(true);
                expect(transposed.unwrap().unwrap()).toBe(42);
            });

            it('transposes Ok(None) to None', () => {
                const { None } = require('./option');
                const result = Ok(None());
                const transposed = result.transpose();
                expect(transposed.is_none()).toBe(true);
            });

            it('transposes Err(e) to Some(Err(e))', () => {
                const result = Err('error') as Result<any, string>;
                const transposed = result.transpose();
                expect(transposed.is_some()).toBe(true);
                expect(transposed.unwrap().is_err()).toBe(true);
                expect(transposed.unwrap().unwrap_err()).toBe('error');
            });

            it('works with complex nested types', () => {
                const { Some } = require('./option');
                const result = Ok(Some({ id: 1, name: 'test' }));
                const transposed = result.transpose();
                expect(transposed.is_some()).toBe(true);
                expect(transposed.unwrap().unwrap()).toEqual({ id: 1, name: 'test' });
            });
        });
    });
});