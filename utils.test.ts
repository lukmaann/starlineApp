import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
    it('should format ISO date strings to DD/MM/YY', () => {
        expect(formatDate('2023-12-25')).toBe('25/12/23');
        expect(formatDate('2024-01-01')).toBe('01/01/24');
    });

    it('should format Date objects to DD/MM/YY', () => {
        const date = new Date(2023, 11, 25); // December 25, 2023
        expect(formatDate(date)).toBe('25/12/23');
    });

    it('should return "N/A" for null or undefined input', () => {
        expect(formatDate(null)).toBe('N/A');
        expect(formatDate(undefined)).toBe('N/A');
        expect(formatDate('')).toBe('N/A');
    });

    it('should return "N/A" for invalid date strings', () => {
        expect(formatDate('invalid-date')).toBe('N/A');
    });

    it('should handle single digit days and months', () => {
        expect(formatDate('2023-05-07')).toBe('07/05/23');
    });

    it('should handle the year transition correctly', () => {
        expect(formatDate('1999-12-31')).toBe('31/12/99');
        expect(formatDate('2000-01-01')).toBe('01/01/00');
    });
});
