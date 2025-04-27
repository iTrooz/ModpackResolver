import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModpackCreator, ModLoader, ModRepository, type ModAndReleases, type ModReleaseMetadata } from './ModpackCreator';
import type { IRepository } from './IRepository';

class MockRepository implements IRepository {
    private mods: Record<string, ModAndReleases> = {};
    private hashes: Record<string, string> = {};
    
    setMod(modId: string, mod: ModAndReleases) {
        this.mods[modId] = mod;
    }
    
    setHash(hash: string, modId: string) {
        this.hashes[hash] = modId;
    }
    
    async getModIdFromHash(hash: string): Promise<string | null> {
        return this.hashes[hash] || null;
    }
    
    async getModReleases(modId: string): Promise<ModAndReleases> {
        if (!this.mods[modId]) {
            throw new Error(`Mod with ID ${modId} not found`);
        }
        return this.mods[modId];
    }
}

describe('ModpackCreator', () => {
    describe('compareVersions', () => {
        const modpackCreator = new ModpackCreator();

        const compareVersions = (a: string, b: string): number => {
            return (modpackCreator as any).compareVersions(a, b);
        };

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
        function createRelease(overrides: Partial<ModReleaseMetadata> = {}): ModReleaseMetadata {
            return {
                mcVersions: ['1.16.5', '1.17.1'],
                modVersion: '1.0.0',
                repository: ModRepository.MODRINTH,
                loaders: [ModLoader.FORGE, ModLoader.FABRIC],
                ...overrides
            };
        }

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

                expect(matchConstraints(release, {
                    exactVersion: '1.16.5',
                    loaders: [ModLoader.FORGE]
                })).toBe(true);

                expect(matchConstraints(release, {
                    minimalVersion: '1.16.0',
                    loaders: [ModLoader.FABRIC]
                })).toBe(true);

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

                expect(matchConstraints(release, {
                    exactVersion: '1.16.5',
                    loaders: [ModLoader.QUILT]
                })).toBe(false);

                expect(matchConstraints(release, {
                    exactVersion: '1.18.0',
                    loaders: [ModLoader.FORGE]
                })).toBe(false);

                expect(matchConstraints(release, {
                    minimalVersion: '1.18.0',
                    loaders: [ModLoader.FABRIC]
                })).toBe(false);
            });
        });
    });
    
    describe('work', () => {
        let modpackCreator: ModpackCreator;
        let mockRepository: MockRepository;
        
        beforeEach(() => {
            mockRepository = new MockRepository();
            
            const jeiMod: ModAndReleases = {
                name: 'Just Enough Items',
                releases: [
                    {
                        mcVersions: ['1.17.1', '1.18.1'],
                        modVersion: '9.0.0',
                        repository: ModRepository.MODRINTH,
                        loaders: [ModLoader.FORGE, ModLoader.FABRIC]
                    },
                    {
                        mcVersions: ['1.16.5'],
                        modVersion: '8.0.0',
                        repository: ModRepository.MODRINTH,
                        loaders: [ModLoader.FORGE, ModLoader.FABRIC]
                    }
                ]
            };

            const dragonsMod: ModAndReleases = {
                name: 'Ice and Fire: Dragons',
                releases: [
                    {
                        mcVersions: ['1.16.5', '1.17.1'],
                        modVersion: '2.0.0',
                        repository: ModRepository.MODRINTH,
                        loaders: [ModLoader.FORGE]
                    },
                    {
                        mcVersions: ['1.12.2'],
                        modVersion: '1.0.0',
                        repository: ModRepository.MODRINTH,
                        loaders: [ModLoader.FORGE]
                    },
                    {
                        mcVersions: ['1.16.5', '1.17.1', '1.18.1'],
                        modVersion: '2.0.0',
                        repository: ModRepository.MODRINTH,
                        loaders: [ModLoader.FABRIC]
                    }
                ]
            };
            
            mockRepository.setMod('jei', jeiMod);
            mockRepository.setMod('ice-and-fire-dragons', dragonsMod);
            
            mockRepository.setHash('123abc', 'jei');
            mockRepository.setHash('456def', 'ice-and-fire-dragons');

            modpackCreator = new ModpackCreator();
            (modpackCreator as any).repositories = [mockRepository];
        });
        
        it('should find a compatible configuration for a single mod', async () => {
            modpackCreator.addModFromID('ice-and-fire-dragons');
            const result = (await modpackCreator.work(1))[0];

            expect(result).toHaveProperty('mcConfig');
            expect(result).toHaveProperty('mods');
            expect(result.mcConfig).toEqual({
                mcVersion: '1.18.1',
                loader: ModLoader.FABRIC
            });
            expect(result.mods).toHaveLength(1);
            expect(result.mods[0].name).toBe('Ice and Fire: Dragons');
            expect(result.mods[0].release.modVersion).toBe('2.0.0');
        });
        
        it('should find a compatible configuration for multiple mods', async () => {
            modpackCreator.addModFromID('jei');
            modpackCreator.addModFromID('ice-and-fire-dragons');
            const result = (await modpackCreator.work(1))[0];

            expect(result).toHaveProperty('mcConfig');
            expect(result).toHaveProperty('mods');
            expect(result.mcConfig).toEqual({
                mcVersion: '1.18.1',
                loader: ModLoader.FABRIC
            });
            expect(result.mods).toHaveLength(2);
            const modNames = result.mods.map(mod => mod.name);
            expect(modNames).toContain('Ice and Fire: Dragons');
            expect(modNames).toContain('Just Enough Items');
        });
        
        it('should respect loader constraints', async () => {
            modpackCreator.setLoaders([ModLoader.FORGE]);
            modpackCreator.addModFromID('ice-and-fire-dragons');
            const result = (await modpackCreator.work(1))[0];
            expect(result.mcConfig.loader).toBe(ModLoader.FORGE);
            expect(result.mcConfig.mcVersion).toBe('1.17.1');
            expect(result.mods[0].release.loaders).toContain(ModLoader.FORGE);
        });
        
        it('should respect exact version constraints', async () => {
            modpackCreator.setExactVersion('1.16.5');
            modpackCreator.addModFromID('ice-and-fire-dragons');
            modpackCreator.addModFromID('jei');
            const result = (await modpackCreator.work(1))[0];
            expect(result.mcConfig.mcVersion).toBe('1.16.5');
            for (const mod of result.mods) {
                expect(mod.release.mcVersions).toContain('1.16.5');
            }
        });
        
        it('should respect minimal version constraints', async () => {
            modpackCreator.chooseMinimalVersion('1.16.0');
            modpackCreator.addModFromID('ice-and-fire-dragons');
            const result = (await modpackCreator.work(1))[0];
            expect(['1.16.5', '1.17.1', '1.18.1']).toContain(result.mcConfig.mcVersion);
        });
        
        it('should handle when no compatible configuration exists', async () => {
            modpackCreator.setExactVersion('1.12.2');
            modpackCreator.setLoaders([ModLoader.FABRIC]);
            modpackCreator.addModFromID('ice-and-fire-dragons');
            const result = await modpackCreator.work(1);
            expect(result).toHaveLength(0);
        });
        
        it('should handle mod lookups by hash', async () => {
            modpackCreator.addModFromHash('123abc');
            const result = (await modpackCreator.work(1))[0];
            expect(result.mods).toHaveLength(1);
            expect(result.mods[0].name).toBe('Just Enough Items');
        });

        it('should handle multiple mod repositories', async () => {
            // Setup second repository
            const secondMockRepo = new MockRepository();
            const secondRepoMod: ModAndReleases = {
                name: 'Second Repo Mod',
                releases: [{
                    mcVersions: ['1.17.1'],
                    modVersion: '1.0.0',
                    repository: ModRepository.CUSTOM,
                    loaders: [ModLoader.FABRIC]
                }]
            };
            secondMockRepo.setMod('second-repo-mod', secondRepoMod);
            (modpackCreator as any).repositories = [mockRepository, secondMockRepo];

            modpackCreator.addModFromID('ice-and-fire-dragons');
            modpackCreator.addModFromID('second-repo-mod');
            const result = (await modpackCreator.work(1))[0];

            expect(result.mods).toHaveLength(2);
            const modNames = result.mods.map(mod => mod.name);
            expect(modNames).toContain('Ice and Fire: Dragons');
            expect(modNames).toContain('Second Repo Mod');
            expect(result.mcConfig.mcVersion).toBe('1.17.1');
            expect(result.mcConfig.loader).toBe(ModLoader.FABRIC);
        });

        it('should use cached mod data if available', async () => {
            const cachedMod: ModAndReleases = {
                name: 'Cached Mod',
                releases: [{
                    mcVersions: ['1.16.5'],
                    modVersion: '1.0.0',
                    repository: ModRepository.MODRINTH,
                    loaders: [ModLoader.FORGE]
                }]
            };
            mockRepository.setMod('cached-mod', cachedMod);
            modpackCreator.addModFromID('cached-mod');

            // Count number of times repository is called
            let foo = mockRepository.getModReleases.bind(mockRepository);
            let hits = 0;
            mockRepository.getModReleases = (args) => {
                hits++;
                return foo(args);
            }

            expect(hits).toBe(0);
            await modpackCreator.work(1);
            await modpackCreator.work(1);
            expect(hits).toBe(1);
        });
    });
});
