import type { IRepository } from "./IRepository";
import { ModrinthRepository } from "./ModrinthRepository";

/**
 * Enum for mod repositories
 */
export enum ModRepository {
    MODRINTH = "modrinth",
    CURSEFORGE = "curseforge",
    FTB = "ftb",
    CUSTOM = "custom"
}

/**
 * Enum for mod source types
 */
export enum ModSourceType {
    HASH = "hash",
    ID = "id",
    NAME = "name"
}

/**
 * Enum for mod loaders
 */
export enum ModLoader {
    FORGE = "forge",
    FABRIC = "fabric",
    QUILT = "quilt",
    NEOFORGE = "neoforge"
}

/**
 * Represents a Minecraft version
 */
export type MCVersion = string;

/**
 * Represents a Minecraft configuration with version and loader
 */
export type MCConfig = {
    mcVersion: MCVersion;
    loader: ModLoader;
};

/**
 * Represents a release of a mod
 */
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

/**
 * Type for an unresolved mod that needs to be processed
 */
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

/**
 * Type for a mod with all its available releases
 */
export type ModAndReleases = {
    /** Mod name */
    name: string;
    /** Available releases of the mod */
    releases: ModReleaseMetadata[];
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
    private cache: Map<UnresolvedMod, ModAndReleases> = new Map(); // TODO check if key is working
    private repositories: IRepository[] = [new ModrinthRepository()];

    constructor() {
        // Initialize empty ModpackCreator
    }

    /**
     * Set the exact Minecraft version for the modpack
     * @param version Minecraft version (e.g., "1.21.1")
     * @returns this instance for method chaining
     */
    setExactVersion(version: string): ModpackCreator {
        this.exactVersion = version;
        return this;
    }

    /**
     * Set the minimum Minecraft version required for the modpack
     * @param version Minimum Minecraft version (e.g., "1.12.2")
     * @returns this instance for method chaining
     */
    chooseMinimalVersion(version: string): ModpackCreator {
        this.minimalVersion = version;
        return this;
    }

    /**
     * Set the mod loaders to use (e.g., ModLoader.FORGE, ModLoader.FABRIC)
     * @param loaders Array of mod loaders
     * @returns this instance for method chaining
     */
    setLoaders(loaders: ModLoader[]): ModpackCreator {
        this.loaders = [...loaders];
        return this;
    }

    /**
     * Add a mod to the modpack using its file hash
     * @param hash Hash of the mod file
     * @returns this instance for method chaining
     */
    addModFromHash(hash: string): ModpackCreator {
        this.unresolvedMods.push({
            source: ModSourceType.HASH,
            data: hash
        });
        return this;
    }

    /**
     * Add a mod to the modpack using its ID from a specified repository
     * @param id ID of the mod in the repository
     * @returns this instance for method chaining
     */
    addModFromID(id: string): ModpackCreator {
        this.unresolvedMods.push({
            source: ModSourceType.ID,
            data: id
        });
        return this;
    }

    /**
     * Add a mod to the modpack using its name from a specified repository
     * @param name Name of the mod in the repository
     * @returns this instance for method chaining
     */
    addModFromName(name: string): ModpackCreator {
        this.unresolvedMods.push({
            source: ModSourceType.NAME,
            data: name
        });
        return this;
    }

    /**
     * Process the modpack configuration and fetch all required information
     */
    async work(): Promise<{mcConfig: MCConfig, mods: ModAndRelease[]}> {

        const resolvedMods = await this.resolveMods();

        return this.resolveBestMcConfig(resolvedMods);
    }

    /**
     * Finds the best Minecraft configuration (version + loader) that satisfies all mods
     * @param mods List of mods with their releases
     * @returns The best configuration and compatible mod releases
     */
    private resolveBestMcConfig(mods: ModAndReleases[]): {mcConfig: MCConfig, mods: ModAndRelease[]} {
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
        
        // Find the first config that has a compatible release for each mod
        for (const config of configCandidates) {
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
            
            // If we found a match for every mod, return this config
            if (matchedModNames.size === mods.length) {
                return {
                    mcConfig: config,
                    mods: matchingModReleases
                };
            }
        }
        
        // No compatible configuration found
        throw new Error("No compatible Minecraft configuration found for all mods");
    }

    private async resolveMods() : Promise<ModAndReleases[]> {
        const resolvedMods: ModAndReleases[] = [];

        // Process each unresolved mod
        for (const unresolvedMod of this.unresolvedMods) {
            // Check if this mod is already in the cache
            let resolvedMod = this.cache.get(unresolvedMod);

            if (!resolvedMod) {
                // Not in cache, we need to resolve it
                resolvedMod = await this.resolveMod(unresolvedMod);

                // Add to cache for future use
                this.cache.set(unresolvedMod, resolvedMod);
            }

            // Add to our result map
            resolvedMods.push(resolvedMod);
        }
        
        return resolvedMods;
    }

    /**
     * Flattens a list of mods and their releases into a list of tuples (mod, release)
     * @param mods List of mods with their releases
     * @returns Flattened list of (mod, release) pairs
     */
    private getFlatReleases(mods: ModAndReleases[]): Array<[{name: string}, ModReleaseMetadata]> {
        return mods.flatMap(mod => 
            mod.releases.map(release => [{name: mod.name}, release] as [{name: string}, ModReleaseMetadata])
        );
    }
    
    /**
     * Extract all unique configuration candidates (version + loader combinations)
     * @param releases Flattened list of mod releases
     * @returns List of unique configuration candidates
     */
    private extractConfigCandidates(releases: Array<[{name: string}, ModReleaseMetadata]>): MCConfig[] {
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
     * Check if a release matches the current constraints
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
                    }
                }
                throw new Error(`Mod with ID ${unresolvedMod.data} not found in any repository`);
            case ModSourceType.NAME:
                // Name-based lookup not implemented
                throw new Error("Mod lookup by name is not implemented yet");
            default:
                throw new Error(`Unknown mod source type: ${unresolvedMod.source}`);
        }
    }
}
