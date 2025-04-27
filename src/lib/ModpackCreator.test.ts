import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModpackCreator, ModLoader, ModRepository, type ModAndReleases, type ModReleaseMetadata } from './ModpackCreator';
import type { IRepository } from './IRepository';

// Mock implementation of IRepository
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
    
    describe('work', () => {
        let modpackCreator: ModpackCreator;
        let mockRepository: MockRepository;
        
        // Set up mock repository with test data
        beforeEach(() => {
            // Create mock repository
            mockRepository = new MockRepository();
            
            // Sample mod data for testing
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
            
            const dragonsModFabric: ModAndReleases = {
                name: 'Ice and Fire: Dragons',
                releases: [
                    {
                        mcVersions: ['1.16.5', '1.17.1', '1.18.1'],
                        modVersion: '2.0.0',
                        repository: ModRepository.MODRINTH,
                        loaders: [ModLoader.FABRIC]
                    }
                ]
            };
            
            const dragonsModForge: ModAndReleases = {
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
                    }
                ]
            };
            
            // Register mods in the mock repository
            mockRepository.setMod('jei', jeiMod);
            mockRepository.setMod('ice-and-fire-dragons-forge', dragonsModForge);
            mockRepository.setMod('ice-and-fire-dragons', dragonsModFabric);
            
            // Set up some hashes
            mockRepository.setHash('123abc', 'jei');
            mockRepository.setHash('456def', 'ice-and-fire-dragons-forge');
            
            // Create ModpackCreator and inject mock repository
            modpackCreator = new ModpackCreator();
            // Need to inject the mock repository by accessing private field
            (modpackCreator as any).repositories = [mockRepository];
        });
        
        it('should find a compatible configuration for a single mod', async () => {
            // Configure ModpackCreator
            modpackCreator.addModFromID('ice-and-fire-dragons');
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Check the result has the expected structure
            expect(result).toHaveProperty('mcConfig');
            expect(result).toHaveProperty('mods');
            
            // Check that the best config is the latest version
            expect(result.mcConfig).toEqual({
                mcVersion: '1.18.1',
                loader: ModLoader.FABRIC
            });
            
            // Check that mods are correctly included
            expect(result.mods).toHaveLength(1);
            expect(result.mods[0].name).toBe('Ice and Fire: Dragons');
            expect(result.mods[0].release.modVersion).toBe('2.0.0');
        });
        
        it('should find a compatible configuration for multiple mods', async () => {
            // Configure ModpackCreator with multiple mods
            modpackCreator.addModFromID('jei');
            modpackCreator.addModFromID('ice-and-fire-dragons');
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Check the result has the expected structure
            expect(result).toHaveProperty('mcConfig');
            expect(result).toHaveProperty('mods');
            
            // Check that the best config is selected from compatible versions
            expect(result.mcConfig).toEqual({
                mcVersion: '1.18.1',  // Latest compatible version for both mods
                loader: ModLoader.FABRIC  // Common loader for both mods
            });
            
            // Check that both mods are included
            expect(result.mods).toHaveLength(2);
            
            // Names should include both mods
            const modNames = result.mods.map(mod => mod.name);
            expect(modNames).toContain('Ice and Fire: Dragons');
            expect(modNames).toContain('Just Enough Items');
        });
        
        it('should respect loader constraints', async () => {
            // Configure ModpackCreator with specific loader
            modpackCreator.setLoaders([ModLoader.FORGE]);
            modpackCreator.addModFromID('ice-and-fire-dragons-forge');
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Check loader constraint is respected
            expect(result.mcConfig.loader).toBe(ModLoader.FORGE);
            
            // Should choose the latest version compatible with FORGE
            expect(result.mcConfig.mcVersion).toBe('1.17.1');
            
            // Mod should be the one supporting Forge
            expect(result.mods[0].release.loaders).toContain(ModLoader.FORGE);
        });
        
        it('should respect exact version constraints', async () => {
            // Configure ModpackCreator with exact version
            modpackCreator.setExactVersion('1.16.5');
            modpackCreator.addModFromID('ice-and-fire-dragons');
            modpackCreator.addModFromID('jei');
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Check exact version constraint is respected
            expect(result.mcConfig.mcVersion).toBe('1.16.5');
            
            // Check mods are compatible with this version
            for (const mod of result.mods) {
                expect(mod.release.mcVersions).toContain('1.16.5');
            }
        });
        
        it('should respect minimal version constraints', async () => {
            // Configure ModpackCreator with minimal version
            modpackCreator.chooseMinimalVersion('1.16.0');
            modpackCreator.addModFromID('ice-and-fire-dragons-forge');
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Should select a version >= minimal version
            expect(['1.16.5', '1.17.1']).toContain(result.mcConfig.mcVersion);
            
            // Should not select versions less than minimal version
            expect(result.mcConfig.mcVersion).not.toBe('1.12.2');
        });
        
        it('should throw an error when no compatible configuration exists', async () => {
            // Set up a scenario where no compatible configuration exists
            modpackCreator.setExactVersion('1.12.2');  // Only the forge version supports 1.12.2
            modpackCreator.setLoaders([ModLoader.FABRIC]);  // But we want Fabric
            modpackCreator.addModFromID('ice-and-fire-dragons-forge');
            
            // Expect work() to throw an error
            await expect(modpackCreator.work()).rejects.toThrow('No compatible Minecraft configuration found for all mods');
        });
        
        it('should handle mod lookups by hash', async () => {
            // Use hash to identify mod
            modpackCreator.addModFromHash('123abc'); // JEI
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Check the mod was found by hash
            expect(result.mods).toHaveLength(1);
            expect(result.mods[0].name).toBe('Just Enough Items');
        });

        it('should handle multiple mod repositories', async () => {
            // Create a second mock repository
            const secondMockRepo = new MockRepository();
            
            // Add a mod only to the second repository
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
            
            // Replace repositories with both mock repositories
            (modpackCreator as any).repositories = [mockRepository, secondMockRepo];
            
            // Add mods from both repositories
            modpackCreator.addModFromID('ice-and-fire-dragons'); // From first repo
            modpackCreator.addModFromID('second-repo-mod'); // From second repo
            
            // Run the work method
            const result = await modpackCreator.work();
            
            // Check that mods from both repositories were found
            expect(result.mods).toHaveLength(2);
            const modNames = result.mods.map(mod => mod.name);
            expect(modNames).toContain('Ice and Fire: Dragons');
            expect(modNames).toContain('Second Repo Mod');
            
            // Should find a compatible version for both mods
            expect(result.mcConfig.mcVersion).toBe('1.17.1');
            expect(result.mcConfig.loader).toBe(ModLoader.FABRIC);
        });
    });
});
