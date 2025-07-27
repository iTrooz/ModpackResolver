import { MCConfig, ModAndRelease, ModAndReleases, ModRelease, Solution, Constraints, ISolutionFinder } from "..";
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

    async findSolutions(mods: string[], constraints: Constraints = {}, nbSolution: number = 5): Promise<Solution[]> {
        logger.debug("findSolutions()");
        const resolvedMods = await this.resolveMods(mods);
        const solutions = this.resolveSolutions(resolvedMods, constraints, nbSolution);
        logger.debug("findSolutions(): %s solutions", solutions.length);
        return solutions;
    }

    resolveSolutions(mods: ModAndReleases[], constraints: Constraints, nbSolution: number): Solution[] {
        logger.debug({ constraints }, "resolveSolutions(mods=%s)", mods.length);

        // Get flat list of all mod releases
        const flatReleases = this.getFlatReleases(mods);
        logger.debug("%s releases after flattening", flatReleases.length);

        // Filter releases based on constraints
        const matchingReleases = flatReleases.filter(({ id, release }) =>
            this.matchConstraints(release, constraints)
        );
        logger.debug("%s releases match constraints", matchingReleases.length);

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
        logger.debug("Iterating over %d config candidates", configCandidates.length);
        for (const config of configCandidates) {
            const matchingModReleases: ModAndRelease[] = [];
            const matchedModIds = new Set<string>();

            for (const {id, release} of matchingReleases) {
                // Skip if we already found a release for this mod
                if (matchedModIds.has(id)) continue;

                // Check if this release matches the current config
                if (release.mcVersions.has(config.mcVersion) &&
                    release.loaders.has(config.loader)) {
                    matchingModReleases.push({
                        id: id,
                        release: release
                    });
                    matchedModIds.add(id);
                }
            }

            // If we found a match for every mod, add this solution
            logger.trace({ config }, "Found solution with %d/%d matching mods", matchingModReleases.length, mods.length);
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

    async resolveMods(modIds: string[]): Promise<ModAndReleases[]> {
        logger.debug("resolveMods(mods=%s)", modIds.length);
        const resolvedMods: ModAndReleases[] = [];

        let releaseCount = 0;
        for (const modId of modIds) {
            let releases = await this.query.getModReleases(modId);
            releaseCount += releases.releases.length;
            resolvedMods.push(releases);
        }

        logger.debug("resolveMods(mods=%s): %s total releases", modIds.length, releaseCount);
        return resolvedMods;
    }

    /**
     * Flattens a list of mods and their releases into a list of tuples (mod, release)
     * @param mods List of mods with their releases
     * @returns Flattened list of (mod, release) pairs
     */
    private getFlatReleases(mods: ModAndReleases[]): Array<ModAndRelease> {
        return mods.flatMap(mod =>
            mod.releases.map(release => ({ id: mod.id, release }))
        );
    }

    /**
     * Extract all unique configuration candidates (version + loader combinations)
     * @param releases Flattened list of mod releases
     * @returns List of unique configuration candidates
     */
    private extractConfigCandidates(releases: Array<ModAndRelease>): MCConfig[] {
        const configs: MCConfig[] = [];
        const configSet = new Set<string>();

        for (const { release } of releases) {
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
    private matchConstraints(release: ModRelease, constraints: Constraints): boolean {
        logger.trace({ release, constraints }, "matchConstraints()");

        // Check loader constraint
        if (constraints.loaders?.size && ![...constraints.loaders].some(l => release.loaders.has(l))) {
            return false;
        }

        // Check minimal version constraint
        if (constraints.minVersion) {
            const hasVersionAboveMin = [...release.mcVersions].some(v => {
                logger.trace({ version: v, minVersion: constraints.minVersion }, "compareVersions()")
                return this.compareVersions(v, constraints.minVersion as string) >= 0
            }
            );
            if (!hasVersionAboveMin) {
                return false;
            }
        }

        // Check maximal version constraint
        if (constraints.maxVersion) {
            const hasVersionBelowMax = [...release.mcVersions].some(v =>
                this.compareVersions(v, constraints.maxVersion as string) <= 0
            );
            if (!hasVersionBelowMax) {
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
