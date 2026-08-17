import { describe, it, expect } from 'vitest';
const { _rateLimitDecision: rateLimitDecision } = require('./index.js');

const HOUR = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30; // must match functions/index.js

describe('rateLimitDecision', () => {
    it('allows a first-ever request (no prior window doc)', () => {
        const result = rateLimitDecision(null, Date.now());
        expect(result.allow).toBe(true);
        expect(result.windowExpired).toBe(true);
        expect(result.count).toBe(1);
    });

    it('allows and increments while under the limit, within the window', () => {
        const now = Date.now();
        const data = { windowStart: { toMillis: () => now - 5 * 60 * 1000 }, count: 10 };
        const result = rateLimitDecision(data, now);
        expect(result.allow).toBe(true);
        expect(result.windowExpired).toBe(false);
        expect(result.count).toBe(11);
    });

    it('blocks once count would exceed the max, within the window', () => {
        const now = Date.now();
        const data = { windowStart: { toMillis: () => now - 5 * 60 * 1000 }, count: RATE_LIMIT_MAX };
        const result = rateLimitDecision(data, now);
        expect(result.allow).toBe(false);
        expect(result.count).toBe(RATE_LIMIT_MAX + 1);
    });

    it('allows exactly at the max', () => {
        const now = Date.now();
        const data = { windowStart: { toMillis: () => now - 5 * 60 * 1000 }, count: RATE_LIMIT_MAX - 1 };
        const result = rateLimitDecision(data, now);
        expect(result.allow).toBe(true);
        expect(result.count).toBe(RATE_LIMIT_MAX);
    });

    it('resets the count once the window has expired, even if previously over the max', () => {
        const now = Date.now();
        const data = { windowStart: { toMillis: () => now - HOUR - 1 }, count: 999 };
        const result = rateLimitDecision(data, now);
        expect(result.allow).toBe(true);
        expect(result.windowExpired).toBe(true);
        expect(result.count).toBe(1);
    });

    it('treats a window exactly at the boundary as not yet expired', () => {
        const now = Date.now();
        const data = { windowStart: { toMillis: () => now - HOUR }, count: 5 };
        const result = rateLimitDecision(data, now);
        expect(result.windowExpired).toBe(false);
    });
});
