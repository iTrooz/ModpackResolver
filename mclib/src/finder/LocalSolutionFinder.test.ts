import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSolutionFinder, ModLoader, ModRepositoryName, type ModAndReleases, type ModRelease, ModSearchMetadata, Constraints, Solution, ISolutionFinder } from '..';
import type { IRepository } from '../repos/IRepository';
import { ModQueryService } from '../ModQueryService';

class MockRepository implements IRepository {
    private mods: Record<string, ModAndReleases> = {};
    private hashes: Record<string, string> = {};
    private dataHashes: Record<string, ModSearchMetadata> = {};

    setMod(modId: string, mod: ModAndReleases) {
        this.mods[modId] = mod;
    }

    setHash(hash: string, modId: string) {
        this.hashes[hash] = modId;
    }

    setDataHash(dataKey: string, mod: ModSearchMetadata) {
        this.dataHashes[dataKey] = mod;
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

    async searchMods(_query: string): Promise<ModSearchMetadata[]> {
        throw new Error('Method not implemented.');
    }

    async getByDataHash(modData: Uint8Array): Promise<ModSearchMetadata | null> {
        // For testing, we'll use a simple key based on the first few bytes
        const key = Array.from(modData.slice(0, 8)).join('-');
        return this.dataHashes[key] || null;
    }

    getRepositoryName(): ModRepositoryName {
        return "mock" as ModRepositoryName;
    }
}

const getSolutionFinder = (repositories: IRepository[]): ISolutionFinder => {
    const solutionFinder = new LocalSolutionFinder(new ModQueryService(repositories));
    return solutionFinder;
}

describe('SolutionFinder', () => {
    describe('compareVersions', () => {
        const SolutionFinder = getSolutionFinder([]);

        const compareVersions = (a: string, b: string): number => {
            return (SolutionFinder as any).compareVersions(a, b);
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
        function createRelease(overrides: Partial<ModRelease> = {}): ModRelease {
            return {
                mcVersions: new Set(['1.16.5', '1.17.1']),
                modVersion: '1.0.0',
                repository: ModRepositoryName.MODRINTH,
                loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC]),
                ...overrides
            };
        }

        function matchConstraints(
            release: ModRelease,
            constraints: Constraints = {}
        ): boolean {
            return (getSolutionFinder([]) as any).matchConstraints(release, constraints);
        }

        it('matches when no constraints are set', () => {
            const release = createRelease();
            expect(matchConstraints(release)).toBe(true);
        });

        describe('loader constraints', () => {
            it('matches when release supports one of the specified loaders', () => {
                const release = createRelease({ loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC]) });

                expect(matchConstraints(release, { loaders: new Set([ModLoader.FORGE]) })).toBe(true);
                expect(matchConstraints(release, { loaders: new Set([ModLoader.FABRIC]) })).toBe(true);
                expect(matchConstraints(release, { loaders: new Set([ModLoader.FORGE, ModLoader.QUILT]) })).toBe(true);
            });

            it('does not match when release does not support any of the specified loaders', () => {
                const release = createRelease({ loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC]) });

                expect(matchConstraints(release, { loaders: new Set([ModLoader.QUILT]) })).toBe(false);
                expect(matchConstraints(release, { loaders: new Set([ModLoader.NEOFORGE]) })).toBe(false);
                expect(matchConstraints(release, { loaders: new Set([ModLoader.QUILT, ModLoader.NEOFORGE]) })).toBe(false);
            });
        });

        describe('minimal version constraints', () => {
            it('matches when release supports a version greater than or equal to minimal version', () => {
                const release = createRelease({ mcVersions: new Set(['1.16.5', '1.17.1']) });

                expect(matchConstraints(release, { minVersion: '1.16.0' })).toBe(true);
                expect(matchConstraints(release, { minVersion: '1.16.5' })).toBe(true);
                expect(matchConstraints(release, { minVersion: '1.17.0' })).toBe(true);
                expect(matchConstraints(release, { minVersion: '1.17.1' })).toBe(true);
            });

            it('does not match when release does not support a version greater than or equal to minimal version', () => {
                const release = createRelease({ mcVersions: new Set(['1.16.5', '1.17.1']) });

                expect(matchConstraints(release, { minVersion: '1.18.0' })).toBe(false);
            });
        });

        describe('combined constraints', () => {
            it('matches when release satisfies all constraints', () => {
                const release = createRelease({
                    mcVersions: new Set(['1.16.5', '1.17.1']),
                    loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC])
                });

                expect(matchConstraints(release, {
                    maxVersion: '1.16.5',
                    loaders: new Set([ModLoader.FORGE])
                })).toBe(true);

                expect(matchConstraints(release, {
                    minVersion: '1.16.0',
                    loaders: new Set([ModLoader.FABRIC])
                })).toBe(true);

                expect(matchConstraints(release, {
                    minVersion: '1.16.0',
                    maxVersion: '1.17.1',
                    loaders: new Set([ModLoader.FORGE])
                })).toBe(true);
            });

            it('does not match when release fails any constraint', () => {
                const release = createRelease({
                    mcVersions: new Set(['1.16.5', '1.17.1']),
                    loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC])
                });

                expect(matchConstraints(release, {
                    maxVersion: '1.15.2',
                    loaders: new Set([ModLoader.QUILT])
                })).toBe(false);

                expect(matchConstraints(release, {
                    minVersion: '1.18.0',
                    loaders: new Set([ModLoader.FORGE])
                })).toBe(false);
            });
        });
    });

    describe('work', () => {
        let solutionFinder: ISolutionFinder;
        let mockRepository: MockRepository;

        beforeEach(() => {
            mockRepository = new MockRepository();

            const jeiMod: ModAndReleases = {
                id: 'jei',
                releases: [
                    {
                        mcVersions: new Set(['1.17.1', '1.18.1']),
                        modVersion: '9.0.0',
                        repository: ModRepositoryName.MODRINTH,
                        loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC])
                    },
                    {
                        mcVersions: new Set(['1.16.5']),
                        modVersion: '8.0.0',
                        repository: ModRepositoryName.MODRINTH,
                        loaders: new Set([ModLoader.FORGE, ModLoader.FABRIC])
                    }
                ]
            };

            const dragonsMod: ModAndReleases = {
                id: 'ice-and-fire-dragons',
                releases: [
                    {
                        mcVersions: new Set(['1.16.5', '1.17.1']),
                        modVersion: '2.0.0',
                        repository: ModRepositoryName.MODRINTH,
                        loaders: new Set([ModLoader.FORGE])
                    },
                    {
                        mcVersions: new Set(['1.12.2']),
                        modVersion: '1.0.0',
                        repository: ModRepositoryName.MODRINTH,
                        loaders: new Set([ModLoader.FORGE])
                    },
                    {
                        mcVersions: new Set(['1.16.5', '1.17.1', '1.18.1']),
                        modVersion: '2.0.0',
                        repository: ModRepositoryName.MODRINTH,
                        loaders: new Set([ModLoader.FABRIC])
                    }
                ]
            };

            mockRepository.setMod('jei', jeiMod);
            mockRepository.setMod('ice-and-fire-dragons', dragonsMod);

            mockRepository.setHash('123abc', 'jei');
            mockRepository.setHash('456def', 'ice-and-fire-dragons');

            solutionFinder = getSolutionFinder([mockRepository]);
        });

        async function findSolution(mods: string[], constraints: Constraints = {}, nbSolution: number = 5): Promise<Solution> {
            return (await solutionFinder.findSolutions(mods, constraints, nbSolution))[0];
        }

        it('should find a compatible configuration for a single mod', async () => {
            const result = await findSolution(['ice-and-fire-dragons']);

            expect(result).toHaveProperty('mcConfig');
            expect(result).toHaveProperty('mods');
            expect(result.mcConfig).toEqual({
                mcVersion: '1.18.1',
                loader: ModLoader.FABRIC
            });
            expect(result.mods).toHaveLength(1);
            expect(result.mods[0].id).toBe('ice-and-fire-dragons');
            expect(result.mods[0].release.modVersion).toBe('2.0.0');
        });

        it('should find a compatible configuration for multiple mods', async () => {
            const result = await findSolution(['jei', 'ice-and-fire-dragons']);

            expect(result).toHaveProperty('mcConfig');
            expect(result).toHaveProperty('mods');
            expect(result.mcConfig).toEqual({
                mcVersion: '1.18.1',
                loader: ModLoader.FABRIC
            });
            expect(result.mods).toHaveLength(2);
            const modIds = result.mods.map(mod => mod.id);
            expect(modIds).toContain('ice-and-fire-dragons');
            expect(modIds).toContain('jei');
        });

        it('should respect loader constraints', async () => {
            const result = (await solutionFinder.findSolutions(['ice-and-fire-dragons'], { loaders: new Set([ModLoader.FORGE]) }))[0];
            expect(result.mcConfig.loader).toBe(ModLoader.FORGE);
            expect(result.mcConfig.mcVersion).toBe('1.17.1');
            expect(result.mods[0].release.loaders).toContain(ModLoader.FORGE);
        });

        it('should respect minimal version constraints', async () => {
            const result = (await solutionFinder.findSolutions(['ice-and-fire-dragons'], { minVersion: '1.16.0' }, 1))[0];
            expect(['1.16.5', '1.17.1', '1.18.1']).toContain(result.mcConfig.mcVersion);
        });

        it('should handle when no compatible configuration exists', async () => {
            const constraints: Constraints = {
                minVersion: '1.12.2',
                maxVersion: '1.12.2',
                loaders: new Set([ModLoader.FABRIC])
            };
            const result = await solutionFinder.findSolutions(['ice-and-fire-dragons'], constraints, 1);
            expect(result).toHaveLength(0);
        });

        it('should handle multiple mod repositories', async () => {
            // Setup second repository
            const secondMockRepo = new MockRepository();
            const secondRepoMod: ModAndReleases = {
                id: 'second-repo-mod',
                releases: [{
                    mcVersions: new Set(['1.17.1']),
                    modVersion: '1.0.0',
                    repository: ModRepositoryName.CURSEFORGE,
                    loaders: new Set([ModLoader.FABRIC])
                }]
            };
            secondMockRepo.setMod('second-repo-mod', secondRepoMod);

            solutionFinder = getSolutionFinder([mockRepository, secondMockRepo]);
            const result = (await solutionFinder.findSolutions(['ice-and-fire-dragons', 'second-repo-mod']))[0];

            expect(result.mods).toHaveLength(2);
            const modIds = result.mods.map(mod => mod.id);
            expect(modIds).toContain('ice-and-fire-dragons');
            expect(modIds).toContain('second-repo-mod');
            expect(result.mcConfig.mcVersion).toBe('1.17.1');
            expect(result.mcConfig.loader).toBe(ModLoader.FABRIC);
        });
    });
});
