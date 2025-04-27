import type { IRepository } from "./IRepository";
import { ModrinthRepository } from "./ModrinthRepository";


export enum ModRepository {
    MODRINTH = "modrinth",
    CURSEFORGE = "curseforge",
    FTB = "ftb",
    CUSTOM = "custom"
}

export enum ModSourceType {
    HASH = "hash",
    ID = "id"
}

export enum ModLoader {
    FORGE = "forge",
    FABRIC = "fabric",
    QUILT = "quilt",
    NEOFORGE = "neoforge"
}

/** Represents a Minecraft version */
export type MCVersion = string;

/** Represents a Minecraft configuration with version and loader */
export type MCConfig = {
    mcVersion: MCVersion;
    loader: ModLoader;
};

/** Represents a release of a mod */
export type ModReleaseMetadata = {
    /** List of Minecraft versions compatible with this release */
    mcVersions: MCVersion[];
    /** Mod version */
    modVersion: string;
    /** Repository where the release is available */
    repository: ModRepository;
    /** Compatible mod loaders */
    loaders: ModLoader[];
};

/** Unresolved mod that needs to be processed */
export type UnresolvedMod = {
    /** Type of source identifier */
    source: ModSourceType;
    /** Data specific to the source type */
    data: string;
};


export type ModAndRelease = {
    name: string;
    release: ModReleaseMetadata;
}

/** Mod with all its available releases */
export type ModAndReleases = {
    /** Mod name */
    name: string;
    /** Available releases of the mod */
    releases: ModReleaseMetadata[];
};

/** Solution to run the modpack, using the given Minecraft version/loader, and the mod releases to use */
export type Solution = {
    /** The Minecraft configuration */
    mcConfig: MCConfig;
    /** The mod releases that are compatible with this configuration */
    mods: ModAndRelease[];
};

/**
 * ModpackCreator Class
 * This class helps to create and manage Minecraft modpacks, handling version compatibility,
 * mod loaders, and checking for incompatibilities between mods.
 */
export class ModpackCreator {
    private exactVersion: string | null = null;
    private minimalVersion: string | null = null;
    private loaders: ModLoader[] = [];
    private unresolvedMods: UnresolvedMod[] = [];
    private cache: Map<UnresolvedMod, ModAndReleases> = new Map();
    private repositories: IRepository[] = [new ModrinthRepository()];

    constructor() {
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

    /**
     * Add a mod to the modpack using its file hash
     */
    addModFromHash(hash: string): ModpackCreator {
        this.unresolvedMods.push({
            source: ModSourceType.HASH,
            data: hash
        });
        return this;
    }

    addModFromID(id: string): ModpackCreator {
        this.unresolvedMods.push({
            source: ModSourceType.ID,
            data: id
        });
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
            let resolvedMod = this.cache.get(unresolvedMod);

            if (!resolvedMod) {
                resolvedMod = await this.resolveMod(unresolvedMod);
                this.cache.set(unresolvedMod, resolvedMod);
            }

            resolvedMods.push(resolvedMod);
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
    private async resolveMod(unresolvedMod: UnresolvedMod): Promise<ModAndReleases> {
        switch (unresolvedMod.source) {
            case ModSourceType.HASH:
                for (const repo of this.repositories) {
                    // Try to get mod ID from hash
                    const modId = await repo.getModIdFromHash(unresolvedMod.data);
                    if (modId) {
                        // If found, get all releases for this mod
                        return await repo.getModReleases(modId);
                    }
                }
                throw new Error(`Mod with hash ${unresolvedMod.data} not found in any repository`);
            case ModSourceType.ID:
                for (const repo of this.repositories) {
                    // Try to get releases for this mod ID
                    try {
                        return await repo.getModReleases(unresolvedMod.data);
                    } catch {
                        // Ignore and try next repository
                        // TODO handle error
                    }
                }
                throw new Error(`Mod with ID ${unresolvedMod.data} not found in any repository`);
        }
    }
}
