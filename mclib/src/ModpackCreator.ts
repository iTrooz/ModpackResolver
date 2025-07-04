import { MCConfig, MCVersion, ModAndRelease, ModAndReleases, ModLoader, ModReleaseMetadata, Solution } from ".";
import { ModQueryService } from "./ModQueryService";

/**
 * ModpackCreator Class
 * This class helps to create and manage Minecraft modpacks, handling version compatibility,
 * mod loaders, and checking for incompatibilities between mods.
 */
export class ModpackCreator {
    private exactVersion: string | null = null;
    private minimalVersion: string | null = null;
    private loaders: ModLoader[] = [];
    private unresolvedMods: string[] = [];
    private query: ModQueryService;

    constructor(query: ModQueryService) {
        this.query = query;
    }

    setExactVersion(version: string): ModpackCreator {
        this.exactVersion = version;
        return this;
    }

    chooseMinimalVersion(version: string): ModpackCreator {
        this.minimalVersion = version;
        return this;
    }

    setLoaders(loaders: ModLoader[]): ModpackCreator {
        this.loaders = [...loaders];
        return this;
    }

    addMod(id: string): ModpackCreator {
        this.unresolvedMods.push(id);
        return this;
    }

    /**
     * Download releases metadata for all mods, and return solutions that try to satisfy the constraints (Best solutions are returned first)
     * This is the method you should use for the main functionality of the class.
     * @param nbSolution Number of solutions to return
     * @returns Array of compatible solutions
     */
    async work(nbSolution: number): Promise<Solution[]> {
        const resolvedMods = await this.resolveMods();
        return this.resolveSolutions(resolvedMods, nbSolution);
    }

    /**
     * Finds the best Minecraft configurations (version + loader) that satisfy all mods
     * @param mods List of mods with their releases
     * @param nbSolution Maximum number of solutions to return
     * @returns Array of compatible solutions
     */
    private resolveSolutions(mods: ModAndReleases[], nbSolution: number): Solution[] {
        // Get flat list of all mod releases
        const flatReleases = this.getFlatReleases(mods);

        // Filter releases based on constraints
        const matchingReleases = flatReleases.filter(([_, release]) =>
            this.matchConstraints(release)
        );

        // Create config candidates (unique mcVersion + loader combinations)
        const configCandidates = this.extractConfigCandidates(matchingReleases);

        // Sort config candidates in descending order by version
        configCandidates.sort((a, b) => {
            // Compare versions directly, for descending order we pass args in reverse
            return this.compareVersions(b.mcVersion, a.mcVersion);
        });

        // Collect solutions up to nbSolution
        const solutions: Solution[] = [];

        // Find configs that have compatible releases for each mod
        for (const config of configCandidates) {
            // Skip if we already have enough solutions
            if (solutions.length >= nbSolution) break;

            const matchingModReleases: ModAndRelease[] = [];
            const matchedModNames = new Set<string>();

            for (const [mod, release] of matchingReleases) {
                // Skip if we already found a release for this mod
                if (matchedModNames.has(mod.name)) continue;

                // Check if this release matches the current config
                if (release.mcVersions.includes(config.mcVersion) &&
                    release.loaders.includes(config.loader)) {
                    matchingModReleases.push({
                        name: mod.name,
                        release: release
                    });
                    matchedModNames.add(mod.name);
                }
            }

            // If we found a match for every mod, add this solution
            if (matchedModNames.size === mods.length) {
                solutions.push({
                    mcConfig: config,
                    mods: matchingModReleases
                });
            }
        }

        return solutions;
    }

    private async resolveMods(): Promise<ModAndReleases[]> {
        const resolvedMods: ModAndReleases[] = [];

        for (const unresolvedMod of this.unresolvedMods) {
            resolvedMods.push(await this.query.getModReleases(unresolvedMod));
        }

        return resolvedMods;
    }

    /**
     * Flattens a list of mods and their releases into a list of tuples (mod, release)
     * @param mods List of mods with their releases
     * @returns Flattened list of (mod, release) pairs
     */
    private getFlatReleases(mods: ModAndReleases[]): Array<[{ name: string }, ModReleaseMetadata]> {
        return mods.flatMap(mod =>
            mod.releases.map(release => [{ name: mod.name }, release] as [{ name: string }, ModReleaseMetadata])
        );
    }

    /**
     * Extract all unique configuration candidates (version + loader combinations)
     * @param releases Flattened list of mod releases
     * @returns List of unique configuration candidates
     */
    private extractConfigCandidates(releases: Array<[{ name: string }, ModReleaseMetadata]>): MCConfig[] {
        const configs: MCConfig[] = [];
        const configSet = new Set<string>();

        for (const [_, release] of releases) {
            for (const mcVersion of release.mcVersions) {
                for (const loader of release.loaders) {
                    const configKey = `${mcVersion}:${loader}`;
                    if (!configSet.has(configKey)) {
                        configSet.add(configKey);
                        configs.push({ mcVersion, loader });
                    }
                }
            }
        }

        return configs;
    }

    /**
     * Check if a mod release matches the current constraints
     * @param release The mod release to check
     * @returns True if the release matches the constraints
     */
    private matchConstraints(release: ModReleaseMetadata): boolean {
        // Check loader constraint
        if (this.loaders.length > 0 && !this.loaders.some(l => release.loaders.includes(l))) {
            return false;
        }

        // Check exact version constraint
        if (this.exactVersion && !release.mcVersions.includes(this.exactVersion)) {
            return false;
        }

        // Check minimal version constraint
        if (this.minimalVersion) {
            const hasVersionAboveMin = release.mcVersions.some(v =>
                this.compareVersions(v, this.minimalVersion as string) >= 0
            );
            if (!hasVersionAboveMin) {
                return false;
            }
        }

        return true;
    }

    /**
     * Compare two Minecraft versions
     * @param a First version
     * @param b Second version
     * @returns -1 if a < b, 0 if a === b, 1 if a > b
     */
    private compareVersions(a: string, b: string): number {
        const aParts = a.split('.').map(p => parseInt(p) || 0);
        const bParts = b.split('.').map(p => parseInt(p) || 0);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = i < aParts.length ? aParts[i] : 0;
            const bVal = i < bParts.length ? bParts[i] : 0;

            if (aVal < bVal) {
                return -1;
            } else if (aVal > bVal) {
                return 1;
            }
        }

        // If we get here, the versions are equal
        return 0;
    }

    /**
     * Resolve an unresolved mod into a ModAndReleases object
     * @param unresolvedMod The unresolved mod to resolve
     * @returns A resolved mod with releases
     */
}
