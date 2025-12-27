<p align="center">
  <img src="https://github.com/indicium-ag/rsult/raw/master/rsult.svg" width="300px"/><br/>
  <img src="https://github.com/indicium-ag/rsult/raw/master/rsult-test.svg" width="450px"/>
</p>

<hr/>

<h5 align="center">
Bring the benefits of Rust's error handling and optional types to your TypeScript projects.
<br/>
Reduce the need for null checks and write safer, more expressive code.
<br/>
<br/> 
rsult offers a collection of practical utilities for handling `Option` and `Result` types,
<br/>
helping you create more robust and maintainable codebases.
</h5>

<hr/>

```bash
$ pnpm add rsult
```

```typescript
import { Option, Result, Some, None, Ok, Err } from 'rsult';

// Async variants for Promise-based workflows
import { ResultAsync, OptionAsync } from 'rsult';
```

### tl;dr

- rsult is inspired by Rust's `Option` and `Result` types.
- It helps you handle optional values and results, eliminating `null` and `undefined` checks.
- You can wrap values in `Some`, `None`, `Ok`, or `Err`, and use handy functions to transform, combine, and handle errors expressively.
- Includes **async variants** (`ResultAsync`, `OptionAsync`) for seamless Promise-based workflows.
- Uses **branded types** for nominal typing and proper TypeScript type safety.

## Usage

### Option

The `Option` type is used for values that may or may not be present. It can be either `Some` or `None`.

#### Creating an Option

```typescript
const someValue: Option<number> = Some(5);
const noneValue: Option<number> = None();
```

#### Checking if an Option is Some or None

```typescript
if (someValue.is_some()) {
 console.log("It's Some!");
}

if (noneValue.is_none()) {
 console.log("It's None!");
}
```

#### Transforming the Value Inside an Option

```typescript
const transformedValue = someValue.map(x => x * 2); // Some(10)
```

#### Handling Options with Default Values

```typescript
const valueWithDefault = noneValue.unwrap_or(0); // 0
```

### Result

The `Result` type is used for operations that can succeed or fail. It can be either `Ok` or `Err`.

#### Creating a Result

```typescript
const okResult: Result<number, string> = Ok(5);
const errResult: Result<number, string> = Err("An error occurred");
```

#### Checking if a Result is Ok or Err

```typescript
if (okResult.is_ok()) {
 console.log("It's Ok!");
}

if (errResult.is_err()) {
 console.log("It's Err!");
}
```

#### Transforming the Value Inside a Result

```typescript
const transformedResult = okResult.map(x => x * 2); // Ok(10)
```

#### Handling Results with Default Values

```typescript
const valueWithDefault = errResult.unwrap_or(0); // 0
```

### Async Variants

rsult provides `ResultAsync` and `OptionAsync` for working with Promises in a type-safe, composable way.

#### ResultAsync

```typescript
import { ResultAsync } from 'rsult';

// Create from various sources
const fromPromise = ResultAsync.fromPromise(fetch('/api/data'));
const fromTry = ResultAsync.try(async () => {
    const response = await fetch('/api/data');
    return response.json();
});

// Chain async operations
const result = await ResultAsync.ok(userId)
    .andThen(id => fetchUser(id))
    .map(user => user.name)
    .mapErr(err => `Failed: ${err.message}`);

// Combine multiple async results
const combined = await ResultAsync.all([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3),
]);
```

#### OptionAsync

```typescript
import { OptionAsync } from 'rsult';

// Create from various sources
const fromNullable = OptionAsync.fromNullable(maybeValue);
const fromPromise = OptionAsync.fromPromise(fetchOptionalData());

// Chain async operations
const result = await OptionAsync.some(userId)
    .andThen(id => findUser(id))
    .map(user => user.email)
    .filter(email => email.endsWith('@example.com'));
```

#### Converting Between Sync and Async

```typescript
// Sync to Async
const asyncResult = Ok(42).toAsync();
const asyncOption = Some('hello').toAsync();

// Async resolves to sync types
const syncResult: Result<number, Error> = await asyncResult;
const syncOption: Option<string> = await asyncOption;
```

## Advanced Usage

### Advanced Usage: Option

#### Advanced Option Transformations

Applying multiple transformations consecutively demonstrates the power of composable operations.

```typescript
const option = Some(10);
const transform = option
  .map(x => x * 2)
  .and_then(x => x > 15 ? Some(x) : None())
  .unwrap_or(0);

console.log(transform); // 20
```

This example showcases converting a numeric option to a string if it meets a condition, providing a default otherwise.

#### Combining Multiple Options

When dealing with multiple optional values, `Option` can elegantly handle combinations, making sure all values are present.

```typescript
const option1: Option<number> = Some(10);
const option2: Option<string> = Some("twenty");

const combinedOption = option1.and_then(num =>
  option2.map(str => `${num} and ${str}`)
);

console.log(combinedOption.unwrap_or("Missing value")); // "10 and twenty"
```

This demonstrates combining numerical and string options into a single descriptive string if both are present.

#### Filtering and Conditional Access

Filter out options that don't satisfy a certain condition, effectively allowing conditional access to `Some` values.

```typescript
const numberOption: Option<number> = Some(42);
const filteredOption = numberOption.filter(x => x > 100);

console.log(filteredOption.is_none()); // true
```

Only values satisfying the condition remain, others turn into `None`.

### Advanced Usage: Result

#### Chaining Result Operations

By chaining operations, you can handle complex data manipulation and error handling with ease.

```typescript
const processResult: Result<number, string> = Ok(5);

const chainedResult = processResult.map(x => x * 2)
  .and_then(x => x > 5 ? Ok(x.toString()) : Err("Value too small"))
  .map_err(err => `Error encountered: ${err}`);

console.log(chainedResult.unwrap_or("Default value")); // "10"
```

This transformation sequence demonstrates error handling and conditional mapping in a powerful, readable manner.

#### Error Recovery

Perform error recovery by providing alternative workflows in case of errors.

```typescript
enum ErrorType {
  NotFound,
  Invalid,
  Unrecoverable,
}

const riskyOperation: Result<number, ErrorType> = Err(ErrorType.NotFound);

const recoveryAttempt = riskyOperation.or_else(err =>
  err !== ErrorType.Unrecoverable ? Ok(0) : Err("Unrecoverable error")
);

console.log(recoveryAttempt.unwrap()); // 0
```

This example shows a simple mechanism for recovering from specific errors, providing a fallback result.

#### Combining Results with Different Types

Use case-driven transformations to work with results of varying types, demonstrating flexibility in handling operations that might fail.

```typescript
const fetchResource: () => Result<string, Error> = () => Ok("Resource content");

const parseResource: (content: string) => Result<object, string> = content =>
  content.length > 0 ? Ok({ parsed: content }) : Err("Empty content");

const result = fetchResource()
  .and_then(parseResource)
  .map(parsed => `Parsed content: ${JSON.stringify(parsed)}`)
  .unwrap_or("Default content");

console.log(result); // "Parsed content: {"parsed":"Resource content"}"
```

## API Reference

### Option

#### Check Methods
- `is_some()`: Checks if the Option is Some.
- `is_none()`: Checks if the Option is None.
- `is_some_and(f: (arg: T) => boolean)`: Determines if the Option is Some and the contained value meets a condition.
- `is_none_or(f: (arg: T) => boolean)`: Returns `true` if the Option is None, or if Some and the value satisfies the predicate.

#### Transform Methods
- `map(fn: (arg: T) => U)`: Transforms the contained value of a Some with a provided function. Returns None if this Option is None.
- `map_or<U>(defaultVal: U, fn: (arg: T) => U)`: Applies a function to the contained value if Some, otherwise returns a provided default.

#### Expect and Unwrap Methods
- `expect(msg: string)`: Extracts the value from a Some, throwing an error if it is None.
- `unwrap()`: Unwraps the Option, returning the contained value, or throws an error if the Option is None.
- `unwrap_or(defaultVal: T)`: Returns the contained value if Some, else returns a provided alternative.
- `unwrap_or_else(fn: () => T)`: Returns the contained value if Some, else computes a value from a provided function.
- `unwrap_or_default()`: Returns the contained value if Some, otherwise the default value for the type.

#### Combine Methods
- `and<U>(opt: Option<U>)`: Returns the passed Option if this Option is Some, else returns None.
- `and_then<U>(fn: (arg: T) => Option<U>)`: Returns the result of applying a function to the contained value if Some, otherwise returns None.
- `or<U>(opt: Option<U>)`: Returns the passed Option if this Option is None, else returns this Option.
- `or_else<U>(fn: () => Option<U>)`: Returns the result of applying a function if this Option is None, else returns this Option.
- `xor(optb: Option<T>)`: Returns None if both this and the passed Option are Some. Otherwise returns the Option that is Some.

#### Mutate Methods
- `take()`: Takes the contained value out of the Option, leaving a None in its place.
- `take_if(predicate: (arg: T) => boolean)`: Takes the contained value out of the Option if it satisfies a predicate, leaving a None in its place.
- `replace(value: T)`: Replaces the contained value with another, returning the old value wrapped in an Option.

#### Zip Methods
- `zip<U>(other: Option<U>)`: Combines two Option values into a single Option containing a tuple of their values if both are Some, otherwise returns None.
- `zip_with<U, R>(other: Option<U>, f: (val: T, other: U) => R)`: Combines two Option values by applying a function if both are Some, otherwise returns None.

#### Filter Method
- `filter(predicate: (arg: T) => boolean)`: Applies a predicate to the contained value if Some, returns None if the predicate does not hold or if this Option is None.

#### Flatten Method
- `flatten()`: Flattens a nested Option, if the Option contains another Option, returning the inner Option if it's Some.

#### Inspection Method
- `inspect(f: (arg: T) => void)`: Calls the provided function with the contained value if Some, returns the Option unchanged.

#### Conversion Methods
- `ok_or<E>(err: E)`: Transforms `Some(v)` to `Ok(v)` and `None` to `Err(err)`.
- `ok_or_else<E>(f: () => E)`: Transforms `Some(v)` to `Ok(v)` and `None` to `Err(f())`.
- `transpose()`: Transposes an `Option<Result<T, E>>` into a `Result<Option<T>, E>`.
- `unzip()`: Unzips an `Option<[A, B]>` into `[Option<A>, Option<B>]`.
- `toAsync()`: Converts the Option to an OptionAsync for async chaining.

### Result

#### Basic Methods
- `is_ok()`: Checks if the Result is Ok.
- `is_err()`: Checks if the Result is Err.
- `ok()`: Retrieves the value from `ResultOk`, wrapped in an `Option`.
- `err()`: Retrieves the error from `ResultErr`, wrapped in an `Option`.

#### Retrieval Methods
- `expect(msg: string)`: Returns the contained `ResultOk` value, but throws an error with a provided message if the result is a `ResultErr`.
- `unwrap()`: Unwraps a `ResultOk`, yielding the contained value.
- `expect_err(msg: string)`: Returns the contained `ResultErr` error, but throws an error with a provided message if the result is a `ResultOk`.
- `unwrap_err()`: Unwraps a `ResultErr`, yielding the contained error.

#### Conversion Methods
- `into_ok()`: Converts from `IResultCore<T, E>` to `T`.
- `into_err()`: Converts from `IResultCore<T, E>` to `E`.
- `transmute()`: Changes the type of `Result<T, E>` to `Result<T, never>` or `Result<never, E>`, respectively. This is particularly useful when trying to forward a `ResultErr` returned by a function whose error type overlaps with the returned error type of the current function, but whose value type does not.

#### Checking and Transforming Methods
- `is_ok_and(f: (value: T) => boolean)`: Checks if the result is Ok and the contained value passes a specified condition.
- `is_err_and(f: (value: E) => boolean)`: Checks if the result is Err and the contained error passes a specified condition.
- `map<U>(fn: (arg: T) => U)`: Transforms the result via a mapping function if it is Ok.
- `map_or<U>(defaultVal: U, f: (arg: T) => U)`: Transforms the result via a mapping function if it is Ok, otherwise returns a default value.
- `map_or_else<U>(defaultFunc: (err: E) => U, f: (arg: T) => U)`: Transforms the result via a mapping function if it is Ok, otherwise computes a default value using a function.
- `map_err<U>(fn: (arg: E) => U)`: Maps a `Result<T, E>` to `Result<T, U>` by applying a function to a contained `Err` value, leaving an `Ok` value untouched.

#### Inspection Methods
- `inspect(f: (val: T) => void)`: Applies a function to the contained value (if Ok), then returns the unmodified Result.
- `inspect_err(f: (val: E) => void)`: Applies a function to the contained error (if Err), then returns the unmodified Result.

#### Combination Methods
- `and<U>(res: Result<U, E>)`: Returns `res` if the result is Ok, otherwise returns the Err value of `self`.
- `and_then<U>(fn: (arg: T) => Result<U, E>)`: Calls `fn` if the result is Ok, otherwise returns the Err value of `self`.
- `or<U>(res: Result<U, E>)`: Returns `res` if the result is Err, otherwise returns the Ok value of `self`.
- `or_else<U>(fn: (arg: E) => Result<T, U>)`: Calls `fn` if the result is Err, otherwise returns the Ok value of `self`.

#### Unwrap Methods with Defaults
- `unwrap_or(defaultVal: T)`: Returns the contained Ok value or a provided default.
- `unwrap_or_else(fn: (arg: E) => T)`: Returns the contained Ok value or computes it from a function.

#### Iteration and Flattening Methods
- `iter()`: Returns an iterator over the potentially contained value.
- `flatten()`: Flattens a nested `Result` if the contained value is itself a `Result`.

#### Transpose and Conversion Methods
- `transpose()`: Transposes a `Result<Option<T>, E>` into an `Option<Result<T, E>>`.
- `toAsync()`: Converts the Result to a ResultAsync for async chaining.

### ResultAsync

A wrapper around `Promise<Result<T, E>>` that enables fluent async/await chains.

#### Constructors
- `ResultAsync.ok<T, E>(value: T)`: Creates a successful ResultAsync.
- `ResultAsync.err<T, E>(error: E)`: Creates a failed ResultAsync.
- `ResultAsync.fromResult(result: Result<T, E> | Promise<Result<T, E>>)`: Wraps a sync or async Result.
- `ResultAsync.fromPromise<T, E>(promise: Promise<T>, mapErr?: (e: unknown) => E)`: Converts a Promise to ResultAsync.
- `ResultAsync.try<T>(fn: () => T | Promise<T>)`: Executes a function and catches any errors.

#### Transformation Methods
- `map<U>(fn: (value: T) => U | Promise<U>)`: Transforms the Ok value.
- `mapErr<U>(fn: (error: E) => U | Promise<U>)`: Transforms the Err value.
- `mapOr<U>(defaultValue: U, fn: (value: T) => U | Promise<U>)`: Maps or returns default.
- `mapOrElse<U>(defaultFn: (error: E) => U, fn: (value: T) => U)`: Maps or computes default.

#### Chaining Methods
- `andThen<U>(fn: (value: T) => Result<U, E> | ResultAsync<U, E>)`: Chains on success.
- `orElse<U>(fn: (error: E) => Result<T, U> | ResultAsync<T, U>)`: Recovers from error.
- `and<U>(other: ResultAsync<U, E>)`: Returns other if Ok.
- `or<U>(other: ResultAsync<T, U>)`: Returns other if Err.

#### Unwrapping Methods
- `unwrap()`: Returns value or throws.
- `unwrapOr(defaultValue: T)`: Returns value or default.
- `unwrapOrElse(fn: (error: E) => T)`: Returns value or computes from error.
- `expect(message: string)`: Returns value or throws with message.

#### Inspection Methods
- `inspect(fn: (value: T) => void)`: Inspects Ok value.
- `inspectErr(fn: (error: E) => void)`: Inspects Err value.
- `isOk()`: Async check if Ok.
- `isErr()`: Async check if Err.

#### Static Combinators
- `ResultAsync.all<T, E>(results: ResultAsync<T, E>[])`: Combines all, short-circuits on first error.
- `ResultAsync.allSettled<T, E>(results: ResultAsync<T, E>[])`: Collects all errors.

#### Pattern Matching
- `match<U>({ Ok, Err })`: Pattern match with handlers.

### OptionAsync

A wrapper around `Promise<Option<T>>` that enables fluent async/await chains.

#### Constructors
- `OptionAsync.some<T>(value: T)`: Creates an OptionAsync with a value.
- `OptionAsync.none<T>()`: Creates an empty OptionAsync.
- `OptionAsync.fromOption(option: Option<T> | Promise<Option<T>>)`: Wraps a sync or async Option.
- `OptionAsync.fromPromise<T>(promise: Promise<T>)`: Converts resolved to Some, rejected to None.
- `OptionAsync.fromNullable<T>(value: T | null | undefined)`: Creates from nullable value.
- `OptionAsync.try<T>(fn: () => T | Promise<T>)`: Executes and returns Some on success, None on error.

#### Transformation Methods
- `map<U>(fn: (value: T) => U | Promise<U>)`: Transforms the Some value.
- `mapOr<U>(defaultValue: U, fn: (value: T) => U | Promise<U>)`: Maps or returns default.
- `mapOrElse<U>(defaultFn: () => U, fn: (value: T) => U)`: Maps or computes default.
- `filter(predicate: (value: T) => boolean | Promise<boolean>)`: Filters the Option.

#### Chaining Methods
- `andThen<U>(fn: (value: T) => Option<U> | OptionAsync<U>)`: Chains on Some.
- `orElse<U>(fn: () => Option<T> | OptionAsync<T>)`: Provides fallback on None.
- `and<U>(other: OptionAsync<U>)`: Returns other if Some.
- `or(other: OptionAsync<T>)`: Returns other if None.

#### Unwrapping Methods
- `unwrap()`: Returns value or throws.
- `unwrapOr(defaultValue: T)`: Returns value or default.
- `unwrapOrElse(fn: () => T)`: Returns value or computes default.
- `expect(message: string)`: Returns value or throws with message.

#### Conversion Methods
- `flatten()`: Flattens nested Option.
- `zip<U>(other: OptionAsync<U>)`: Combines two Options into tuple.
- `zipWith<U, R>(other: OptionAsync<U>, fn: (a: T, b: U) => R)`: Combines with function.

#### Static Combinators
- `OptionAsync.all<T>(options: OptionAsync<T>[])`: Combines all, returns None if any is None.

#### Pattern Matching
- `match<U>({ Some, None })`: Pattern match with handlers.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

rsult is licensed under the MIT License.