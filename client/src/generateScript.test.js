import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './generateScript';

describe('buildSystemPrompt', () => {
    it('names the assistant and its role/emotion in the prompt', () => {
        const prompt = buildSystemPrompt({ name: 'Alex', role: 'Drill Sergeant', emotion: 'Urgent' });
        expect(prompt).toContain('Alex');
        expect(prompt).toContain('Drill Sergeant');
        expect(prompt).toContain('Urgent');
    });

    it('falls back to a generic instruction for a role/emotion with no matching hint', () => {
        const prompt = buildSystemPrompt({ name: 'Alex', role: 'Not A Real Role', emotion: 'Not A Real Emotion' });
        expect(prompt).toContain('stay fully in character for this role');
        expect(prompt).toContain('match this tone throughout');
    });
});

describe('buildUserPrompt', () => {
    const event = {
        title: 'Team Standup',
        start: new Date('2026-08-17T09:00:00'),
        location: 'Zoom',
        description: 'Daily sync',
    };

    it('always includes the event title and time', () => {
        const prompt = buildUserPrompt(event, null);
        expect(prompt).toContain('Event: Team Standup');
        expect(prompt).toMatch(/When: .*2026/);
    });

    it('includes location and description only when present', () => {
        const withExtras = buildUserPrompt(event, null);
        expect(withExtras).toContain('Location: Zoom');
        expect(withExtras).toContain('Details: Daily sync');

        const bare = buildUserPrompt({ title: 'No Details', start: event.start }, null);
        expect(bare).not.toContain('Location:');
        expect(bare).not.toContain('Details:');
    });

    it('mentions the reminder lead time only when a reminder is given', () => {
        const withReminder = buildUserPrompt(event, { amount: 10, unit: 'minutes' });
        expect(withReminder).toContain('10 minutes before');

        const withoutReminder = buildUserPrompt(event, null);
        expect(withoutReminder).not.toContain('before the event starts');
    });
});
