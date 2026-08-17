import { describe, it, expect } from 'vitest';
import { colorForKey, EVENT_COLORS } from './eventColors';

describe('colorForKey', () => {
    it('is deterministic — same key always maps to the same color', () => {
        expect(colorForKey('Exec Meeting')).toBe(colorForKey('Exec Meeting'));
    });

    it('only ever returns a color from the shared palette', () => {
        const keys = ['Standup', 'Dentist', '', 'a', 'z'.repeat(50)];
        for (const key of keys) {
            expect(EVENT_COLORS).toContain(colorForKey(key));
        }
    });

    it('handles null/undefined without throwing', () => {
        expect(() => colorForKey(null)).not.toThrow();
        expect(() => colorForKey(undefined)).not.toThrow();
    });
});
