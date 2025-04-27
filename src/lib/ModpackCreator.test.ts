import { describe, it, expect } from 'vitest';
import { ModpackCreator, ModLoader } from './ModpackCreator';

describe('ModpackCreator', () => {
    describe('compareVersions', () => {
        // Create an instance to access the private method via type casting
        const modpackCreator = new ModpackCreator();

        // Helper function to access private method
        const compareVersions = (a: string, b: string): number => {
            return (modpackCreator as any).compareVersions(a, b);
        };
        
        // Helper function to check if a >= b (for backward compatibility with tests)
        const isGreaterOrEqual = (a: string, b: string): boolean => {
            return compareVersions(a, b) >= 0;
        };

        it('compares simple versions correctly', () => {
            expect(compareVersions('1.16.5', '1.16.4')).toBe(1);     // 1.16.5 > 1.16.4
            expect(compareVersions('1.16.4', '1.16.5')).toBe(-1);    // 1.16.4 < 1.16.5
            expect(compareVersions('1.17.1', '1.16.5')).toBe(1);     // 1.17.1 > 1.16.5
            expect(compareVersions('1.16.5', '1.17.1')).toBe(-1);    // 1.16.5 < 1.17.1
            expect(compareVersions('1.16.5', '1.16.5')).toBe(0);     // 1.16.5 = 1.16.5
        });

        it('handles versions with different number of parts', () => {
            expect(compareVersions('1.16', '1.16.0')).toBe(0);      // 1.16 = 1.16.0
            expect(compareVersions('1.16.0', '1.16')).toBe(0);      // 1.16.0 = 1.16
            expect(compareVersions('1.16.1', '1.16')).toBe(1);      // 1.16.1 > 1.16
            expect(compareVersions('1.16', '1.16.1')).toBe(-1);     // 1.16 < 1.16.1
        });

        it('can test for version equality', () => {
            expect(compareVersions('1.16.5', '1.16.5')).toBe(0);    // 1.16.5 = 1.16.5
            expect(compareVersions('1.16', '1.16.0')).toBe(0);      // 1.16 = 1.16.0
            expect(compareVersions('1.16.0', '1.16')).toBe(0);      // 1.16.0 = 1.16
        });
    });
});
