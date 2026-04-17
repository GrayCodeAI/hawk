import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { getEnv, isDevelopment, isTest, isProduction, isInternalUser, getEnvironmentInfo } from './env.js';

describe('getEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns environment variable value', () => {
    process.env.HAWK_CODE_SIMPLE = 'true';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(true);
  });

  test('returns default value when env var is not set', () => {
    delete process.env.HAWK_CODE_SIMPLE;
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(false);
  });

  test('parses boolean values correctly', () => {
    process.env.HAWK_CODE_SIMPLE = '1';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(true);

    process.env.HAWK_CODE_SIMPLE = 'true';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(true);

    process.env.HAWK_CODE_SIMPLE = 'yes';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(true);

    process.env.HAWK_CODE_SIMPLE = 'on';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(true);

    process.env.HAWK_CODE_SIMPLE = 'false';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(false);

    process.env.HAWK_CODE_SIMPLE = '0';
    expect(getEnv('HAWK_CODE_SIMPLE')).toBe(false);
  });

  test('returns string values', () => {
    process.env.NODE_ENV = 'development';
    expect(getEnv('NODE_ENV')).toBe('development');
  });
});

describe('isDevelopment', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('returns true when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    expect(isDevelopment()).toBe(true);
  });

  test('returns false when NODE_ENV is not development', () => {
    process.env.NODE_ENV = 'production';
    expect(isDevelopment()).toBe(false);
  });
});

describe('isTest', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('returns true when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';
    expect(isTest()).toBe(true);
  });

  test('returns false when NODE_ENV is not test', () => {
    process.env.NODE_ENV = 'production';
    expect(isTest()).toBe(false);
  });
});

describe('isProduction', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('returns true when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  test('returns false when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    expect(isProduction()).toBe(false);
  });
});

describe('isInternalUser', () => {
  const originalEnv = process.env.USER_TYPE;

  afterEach(() => {
    process.env.USER_TYPE = originalEnv;
  });

  test('returns true when USER_TYPE is ant', () => {
    process.env.USER_TYPE = 'ant';
    expect(isInternalUser()).toBe(true);
  });

  test('returns false when USER_TYPE is not ant', () => {
    process.env.USER_TYPE = 'external';
    expect(isInternalUser()).toBe(false);
  });
});

describe('getEnvironmentInfo', () => {
  test('returns environment info object', () => {
    const info = getEnvironmentInfo();

    expect(info).toHaveProperty('nodeEnv');
    expect(info).toHaveProperty('userType');
    expect(info).toHaveProperty('isSimpleMode');
    expect(info).toHaveProperty('isRemoteMode');
    expect(info).toHaveProperty('hasGrayCodeKey');
    expect(info).toHaveProperty('hasOpenAIKey');
    expect(info).toHaveProperty('hasAnthropicKey');
    expect(info).toHaveProperty('hasGeminiKey');
    expect(info).toHaveProperty('hasGrokKey');
    expect(info).toHaveProperty('hasOpenRouterKey');
  });
});
