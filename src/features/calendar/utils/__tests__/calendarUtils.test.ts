import { describe, it, expect } from 'vitest';
import { parseDate, getMonthDays, getWeekDays } from '../calendarUtils';
import { isSameDay, format } from 'date-fns';

describe('calendarUtils', () => {
    describe('parseDate', () => {
        it('should parse YYYY-MM-DD string into local Date object', () => {
            const dateStr = '2024-03-05';
            const result = parseDate(dateStr);

            expect(result).not.toBeNull();
            if (result) {
                // Verify it matches the local date components
                expect(result.getFullYear()).toBe(2024);
                expect(result.getMonth()).toBe(2); // 0-indexed March
                expect(result.getDate()).toBe(5);

                // Key verification: formatting it back should yield the same string
                expect(format(result, 'yyyy-MM-dd')).toBe(dateStr);
            }
        });

        it('should return null for invalid date strings', () => {
            expect(parseDate('')).toBeNull();
            expect(parseDate(undefined)).toBeNull();
            // parse from date-fns might be lenient or throw depending on how it's called
            // but our wrapper has a try-catch
            expect(parseDate('invalid-date')).toBeNull();
        });
    });

    describe('getMonthDays', () => {
        it('should generate correct number of days for a month grid', () => {
            const march2024 = new Date(2024, 2, 1); // March 1st, 2024
            const days = getMonthDays(march2024);

            // March 2024 starts on Friday (index 5)
            // If week starts on Sunday (index 0), it should include 5 days from Feb
            // March has 31 days. 31 + 5 = 36. 
            // To fill the last week (starts Sunday), it might add more.
            // Usually it's 35 or 42 days (5 or 6 weeks)
            expect(days.length % 7).toBe(0);
            expect(days.length).toBeGreaterThanOrEqual(35);
        });

        it('should correctly identify today', () => {
            const today = new Date();
            const monthDays = getMonthDays(today);
            const todayInGrid = monthDays.find(d => isSameDay(d.date, today));
            expect(todayInGrid?.isToday).toBe(true);
        });
    });
});
