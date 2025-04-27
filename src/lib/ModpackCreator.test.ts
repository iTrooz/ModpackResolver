import { describe, it, expect } from 'vitest';
import { ModpackCreator, ModLoader, ModRepository } from './ModpackCreator';
import type { ModReleaseMetadata } from './ModpackCreator';

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

    describe('matchConstraints', () => {
        // Helper function to create a ModReleaseMetadata object with default values
        function createRelease(overrides: Partial<ModReleaseMetadata> = {}): ModReleaseMetadata {
            return {
                mcVersions: ['1.16.5', '1.17.1'],
                modVersion: '1.0.0',
                repository: ModRepository.MODRINTH,
                loaders: [ModLoader.FORGE, ModLoader.FABRIC],
                ...overrides
            };
        }

        // Helper function to access private matchConstraints method
        function matchConstraints(
            release: ModReleaseMetadata,
            modpackSettings: {
                loaders?: ModLoader[],
                exactVersion?: string,
                minimalVersion?: string
            } = {}
        ): boolean {
            const modpack = new ModpackCreator();

            if (modpackSettings.loaders) {
                modpack.setLoaders(modpackSettings.loaders);
            }

            if (modpackSettings.exactVersion) {
                modpack.setExactVersion(modpackSettings.exactVersion);
            }

            if (modpackSettings.minimalVersion) {
                modpack.chooseMinimalVersion(modpackSettings.minimalVersion);
            }

            return (modpack as any).matchConstraints(release);
        }

        it('matches when no constraints are set', () => {
            const release = createRelease();
            expect(matchConstraints(release)).toBe(true);
        });

        describe('loader constraints', () => {
            it('matches when release supports one of the specified loaders', () => {
                const release = createRelease({ loaders: [ModLoader.FORGE, ModLoader.FABRIC] });

                expect(matchConstraints(release, { loaders: [ModLoader.FORGE] })).toBe(true);
                expect(matchConstraints(release, { loaders: [ModLoader.FABRIC] })).toBe(true);
                expect(matchConstraints(release, { loaders: [ModLoader.FORGE, ModLoader.QUILT] })).toBe(true);
            });

            it('does not match when release does not support any of the specified loaders', () => {
                const release = createRelease({ loaders: [ModLoader.FORGE, ModLoader.FABRIC] });

                expect(matchConstraints(release, { loaders: [ModLoader.QUILT] })).toBe(false);
                expect(matchConstraints(release, { loaders: [ModLoader.NEOFORGE] })).toBe(false);
                expect(matchConstraints(release, { loaders: [ModLoader.QUILT, ModLoader.NEOFORGE] })).toBe(false);
            });
        });

        describe('exact version constraints', () => {
            it('matches when release supports the exact version', () => {
                const release = createRelease({ mcVersions: ['1.16.5', '1.17.1'] });

                expect(matchConstraints(release, { exactVersion: '1.16.5' })).toBe(true);
                expect(matchConstraints(release, { exactVersion: '1.17.1' })).toBe(true);
            });

            it('does not match when release does not support the exact version', () => {
                const release = createRelease({ mcVersions: ['1.16.5', '1.17.1'] });

                expect(matchConstraints(release, { exactVersion: '1.16.4' })).toBe(false);
                expect(matchConstraints(release, { exactVersion: '1.18.0' })).toBe(false);
            });
        });

        describe('minimal version constraints', () => {
            it('matches when release supports a version greater than or equal to minimal version', () => {
                const release = createRelease({ mcVersions: ['1.16.5', '1.17.1'] });

                expect(matchConstraints(release, { minimalVersion: '1.16.0' })).toBe(true);
                expect(matchConstraints(release, { minimalVersion: '1.16.5' })).toBe(true);
                expect(matchConstraints(release, { minimalVersion: '1.17.0' })).toBe(true);
                expect(matchConstraints(release, { minimalVersion: '1.17.1' })).toBe(true);
            });

            it('does not match when release does not support a version greater than or equal to minimal version', () => {
                const release = createRelease({ mcVersions: ['1.16.5', '1.17.1'] });

                expect(matchConstraints(release, { minimalVersion: '1.18.0' })).toBe(false);
            });
        });

        describe('combined constraints', () => {
            it('matches when release satisfies all constraints', () => {
                const release = createRelease({
                    mcVersions: ['1.16.5', '1.17.1'],
                    loaders: [ModLoader.FORGE, ModLoader.FABRIC]
                });

                // Exact version + loader
                expect(matchConstraints(release, {
                    exactVersion: '1.16.5',
                    loaders: [ModLoader.FORGE]
                })).toBe(true);

                // Minimal version + loader
                expect(matchConstraints(release, {
                    minimalVersion: '1.16.0',
                    loaders: [ModLoader.FABRIC]
                })).toBe(true);

                // All constraints
                expect(matchConstraints(release, {
                    exactVersion: '1.17.1',
                    minimalVersion: '1.16.0',
                    loaders: [ModLoader.FORGE]
                })).toBe(true);
            });

            it('does not match when release fails any constraint', () => {
                const release = createRelease({
                    mcVersions: ['1.16.5', '1.17.1'],
                    loaders: [ModLoader.FORGE, ModLoader.FABRIC]
                });

                // Fails loader constraint
                expect(matchConstraints(release, {
                    exactVersion: '1.16.5',
                    loaders: [ModLoader.QUILT]
                })).toBe(false);

                // Fails exact version constraint
                expect(matchConstraints(release, {
                    exactVersion: '1.18.0',
                    loaders: [ModLoader.FORGE]
                })).toBe(false);

                // Fails minimal version constraint
                expect(matchConstraints(release, {
                    minimalVersion: '1.18.0',
                    loaders: [ModLoader.FABRIC]
                })).toBe(false);
            });
        });
    });
});
