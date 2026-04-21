import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies required by @modules/grpc/utils/utils.ts so we can import getIdentity
vi.mock('@shared/utils/readToken', () => ({
  readToken: vi.fn(() => ({ exp: 9999999999 })),
}));

vi.mock('nice-grpc-web', () => ({
  Metadata: vi.fn((obj: any) => obj),
  createChannel: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@modules/grpc/clients/authClient', () => ({
  authClient: { refreshToken: vi.fn() },
}));

vi.mock('@modules/grpc/clients/nodeClient', () => ({}));

import { checkForApiError } from '@utils/checkForApiError';
import { ApplicationError } from '@modules/auth/utils/Errors';
import { getIdentity } from '@modules/grpc/utils/utils';

// ---------------------------------------------------------------------------
// checkForApiError
// ---------------------------------------------------------------------------
describe('Stability Fix: checkForApiError', () => {
  it('should NOT throw for a response with code 0 (gRPC OK status)', () => {
    expect(() => checkForApiError('TestOp', { code: 0 })).not.toThrow();
  });

  it('should throw ApplicationError for every gRPC error code from 1 to 16', () => {
    for (let code = 1; code <= 16; code++) {
      expect(
        () => checkForApiError('TestOp', { code, message: `err-${code}` }),
        `Expected throw for code ${code}`,
      ).toThrow(ApplicationError);
    }
  });

  it('should include the response message in the thrown error', () => {
    expect(() =>
      checkForApiError('TestOp', { code: 2, message: 'something broke' }),
    ).toThrow('something broke');
  });

  it('should use "Unknown" as the message when the response has no message', () => {
    expect(() =>
      checkForApiError('TestOp', { code: 5 }),
    ).toThrow('Unknown');
  });

  it('should set the error name to the provided type string', () => {
    try {
      checkForApiError('MyOperation', { code: 3, message: 'bad' });
      // Should not reach here
      expect.unreachable('Expected ApplicationError to be thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApplicationError);
      expect((e as ApplicationError).name).toBe('MyOperation');
    }
  });

  it('should NOT throw for codes outside the 1-16 range', () => {
    expect(() => checkForApiError('TestOp', { code: 17, message: 'nope' })).not.toThrow();
    expect(() => checkForApiError('TestOp', { code: -1, message: 'nope' })).not.toThrow();
    expect(() => checkForApiError('TestOp', { code: 100, message: 'nope' })).not.toThrow();
  });

  it('should return early (not throw) when response has no code and no message', () => {
    expect(() => checkForApiError('TestOp', {})).not.toThrow();
    expect(checkForApiError('TestOp', {})).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ApplicationError
// ---------------------------------------------------------------------------
describe('Stability Fix: ApplicationError', () => {
  it('should be an instance of Error', () => {
    const err = new ApplicationError('TestError', 'something went wrong');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be an instance of ApplicationError', () => {
    const err = new ApplicationError('TestError', 'something went wrong');
    expect(err).toBeInstanceOf(ApplicationError);
  });

  it('should set name and message correctly', () => {
    const err = new ApplicationError('MyCustomName', 'detailed message');
    expect(err.name).toBe('MyCustomName');
    expect(err.message).toBe('detailed message');
  });

  it('should have a proper stack trace', () => {
    const err = new ApplicationError('StackTest', 'trace me');
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe('string');
    // The stack should mention the error message or name somewhere
    expect(err.stack).toContain('trace me');
  });

  it('should be catchable via generic Error catch', () => {
    let caught = false;
    try {
      throw new ApplicationError('CatchTest', 'catch me');
    } catch (e) {
      if (e instanceof Error) {
        caught = true;
        expect(e.message).toBe('catch me');
        expect(e.name).toBe('CatchTest');
      }
    }
    expect(caught).toBe(true);
  });

  it('should pass instanceof check after Object.setPrototypeOf fix', () => {
    const err = new ApplicationError('Proto', 'check');
    // This is the key fix — without Object.setPrototypeOf, instanceof
    // returns false in transpiled (ES5) output.
    expect(err instanceof ApplicationError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getIdentity
// ---------------------------------------------------------------------------
describe('Stability Fix: getIdentity', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
  })();

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  it('should return empty string when no identity is stored', () => {
    const result = getIdentity();
    expect(result).toBe('');
  });

  it('should return parsed identity object when valid JSON is stored', () => {
    const identity = { accessToken: 'abc123', user: 'test@example.com' };
    localStorageMock.setItem('identity', JSON.stringify(identity));

    const result = getIdentity();
    expect(result).toEqual(identity);
    expect(result.accessToken).toBe('abc123');
  });

  it('should return empty string and clear corrupted data when JSON is invalid', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    localStorageMock.setItem('identity', '{not-valid-json!!!}');

    const result = getIdentity();

    expect(result).toBe('');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('identity');
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to parse identity from localStorage, clearing corrupted data.',
    );

    warnSpy.mockRestore();
  });

  it('should return empty string when identity value is an empty string', () => {
    // localStorage.getItem returns null for missing keys, but if someone
    // stored an empty string it's still falsy → early return ''
    localStorageMock.setItem('identity', '');

    // Our mock stores '' which is falsy, so getItem returns '' —
    // but the function checks `if (!raw)` which catches both null and ''.
    const result = getIdentity();
    expect(result).toBe('');
  });

  it('should handle a stored JSON string (non-object) gracefully', () => {
    localStorageMock.setItem('identity', JSON.stringify('just-a-string'));

    const result = getIdentity();
    expect(result).toBe('just-a-string');
  });
});
