import { describe, it, expect } from 'vitest';
import { parseTimeText, to12h } from './timeUtils';

describe('parseTimeText', () => {
    it('parses "h:mm am/pm"', () => {
        expect(parseTimeText('4:38 pm')).toBe('16:38');
        expect(parseTimeText('4:38 am')).toBe('04:38');
    });

    it('parses shorthand digits with a full am/pm word attached, no space', () => {
        expect(parseTimeText('438pm')).toBe('16:38');
        expect(parseTimeText('1015pm')).toBe('22:15');
    });

    it('parses shorthand digits with a single-letter am/pm marker attached', () => {
        expect(parseTimeText('438p')).toBe('16:38');
        expect(parseTimeText('915a')).toBe('09:15');
    });

    it('parses 24h-style 4-digit shorthand with no am/pm marker', () => {
        expect(parseTimeText('1630')).toBe('16:30');
    });

    it('parses hour-only input', () => {
        expect(parseTimeText('4p')).toBe('16:00');
        expect(parseTimeText('4')).toBe('04:00');
    });

    it('treats 12pm as noon and 12am as midnight', () => {
        expect(parseTimeText('12pm')).toBe('12:00');
        expect(parseTimeText('12am')).toBe('00:00');
    });

    it('rejects out-of-range hours/minutes', () => {
        expect(parseTimeText('25:00')).toBeNull();
        expect(parseTimeText('12:99')).toBeNull();
    });

    it('rejects empty/garbage input', () => {
        expect(parseTimeText('')).toBeNull();
        expect(parseTimeText(null)).toBeNull();
        expect(parseTimeText('not a time')).toBeNull();
    });
});

describe('to12h', () => {
    it('formats 24h "HH:mm" as 12h with am/pm', () => {
        expect(to12h('16:38')).toBe('4:38 PM');
        expect(to12h('04:38')).toBe('4:38 AM');
        expect(to12h('00:00')).toBe('12:00 AM');
        expect(to12h('12:00')).toBe('12:00 PM');
    });

    it('returns empty string for empty input', () => {
        expect(to12h('')).toBe('');
        expect(to12h(null)).toBe('');
    });
});
