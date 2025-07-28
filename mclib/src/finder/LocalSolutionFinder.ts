import { MCConfig, ModRepoRelease, Solution, Constraints, ISolutionFinder, ModMetadata, ModReleases, ModLoader } from "..";
import { logger } from "../logger";
import { ModQueryService } from "../ModQueryService";

/**
 * SolutionFinder Class
 * This class helps to create and manage Minecraft modpacks, handling version compatibility,
 * mod loaders, and checking for incompatibilities between mods.
 */
export class LocalSolutionFinder implements ISolutionFinder {
    private query: ModQueryService;

    constructor(modQueryService: ModQueryService) {
        this.query = modQueryService;
    }

    async findSolutions(mods: ModMetadata[], constraints: Constraints = {}, nbSolution: number = 5): Promise<Solution[]> {
        logger.debug("findSolutions()");
        const resolvedMods = await this.resolveMods(mods);
        const solutions = this.resolveSolutions(resolvedMods, constraints, nbSolution);
        logger.debug("findSolutions(): %s solutions", solutions.length);
        return solutions;
    }

    resolveSolutions(modsReleases: ModReleases[], constraints: Constraints, nbSolution: number): Solution[] {
        logger.debug({ constraints }, "resolveSolutions(mods=%s)", modsReleases.length);

        // Create config candidates (unique mcVersion + loader combinations)
        const configCandidates = this.extractConfigCandidates(modsReleases.flat(), constraints);

        // Sort config candidates in descending order by version
        configCandidates.sort((a, b) => {
            // Compare versions directly, for descending order we pass args in reverse
            return this.compareVersions(b.mcVersion, a.mcVersion);
        });

        // Collect solutions up to nbSolution
        const solutions: Solution[] = [];

        // Find configs that have compatible releases for each mod
        logger.debug("Iterating over %d config candidates", configCandidates.length);
        for (const config of configCandidates) {
            // Collect one solution

            const matchingModReleases: ModRepoRelease[] = [];

            for (const mod of modsReleases) { // for every mod
                for (const release of mod) { // for every release for this mod
                    // Check if this release matches the current config
                    if (release.mcVersions.has(config.mcVersion) &&
                        release.loaders.has(config.loader)) {
                        matchingModReleases.push(release);
                        // We got a release for this mod, break and go to next mod
                        break
                    }
                }
            }

            // Add to solutions list
            logger.trace({ config }, "Found solution with %d/%d matching mods", matchingModReleases.length, modsReleases.length);
            solutions.push({
                mcConfig: config,
                mods: matchingModReleases
            });

        }

        // Return top 'nbSolution' solutions
        solutions.sort((a, b) => {
            return b.mods.length - a.mods.length;
        });
        if (solutions.length > nbSolution) solutions.length = nbSolution; // Trim to nbSolution
        logger.debug("resolveSolutions(): %s solutions (sizes: [%s])", solutions.length, solutions.map(s => s.mods.length).join(", "));
        return solutions;
    }

    async resolveMods(modsMeta: ModMetadata[]): Promise<ModReleases[]> {
        logger.debug("resolveMods(mods=%s)", modsMeta.length);
        const resolvedMods: ModReleases[] = [];

        let releaseCount = 0;
        for (const modMeta of modsMeta) {
            const releases = await this.query.getModReleasesFromMetadata(modMeta);
            releaseCount += releases.length;
            resolvedMods.push(releases);
        }

        logger.debug("resolveMods(mods=%s): %s total releases", modsMeta.length, releaseCount);
        return resolvedMods;
    }

    /**
     * Extract all unique configuration candidates (version + loader combinations)
     * @param releases Flattened list of mod releases
     * @returns List of unique configuration candidates
     */
    private extractConfigCandidates(releases: Array<ModRepoRelease>, constraints: Constraints): MCConfig[] {
        const configs: MCConfig[] = [];
        const configSet = new Set<string>();

        for (const release of releases) {
            for (const mcVersion of release.mcVersions) {
                for (const loader of release.loaders) {
                    // check if it matches constraints
                    if (!this.loaderMatchConstraints(loader, constraints) || !this.versionMatchConstraints(mcVersion, constraints)) {
                        continue;
                    }

                    // Add to config candidates
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

    private loaderMatchConstraints(loader: ModLoader, constraints: Constraints): boolean {
        if (constraints.loaders?.size) {
            return [...constraints.loaders].some(l => l === loader);
        }
        return true;
    }

    private versionMatchConstraints(version: string, constraints: Constraints): boolean {
        if (constraints.minVersion && this.compareVersions(version, constraints.minVersion) < 0) {
            return false;
        }
        if (constraints.maxVersion && this.compareVersions(version, constraints.maxVersion) > 0) {
            return false;
        }
        return true;
    }

    /**
     * Check if a mod release matches the current constraints
     * @param release The mod release to check
     * @returns True if the release matches the constraints
     */
    private releaseMatchConstraints(release: ModRepoRelease, constraints: Constraints): boolean {
        logger.trace({ release, constraints }, "matchConstraints()");

        // Check loader constraint
        if (constraints.loaders?.size && ![...release.loaders].some(l => this.loaderMatchConstraints(l, constraints))) {
            return false;
        }

        // Check minimal/maximal version constraint
        const hasMatchingVersion = [...release.mcVersions].some(v => this.versionMatchConstraints(v, constraints));
        if (!hasMatchingVersion) {
            return false;
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
