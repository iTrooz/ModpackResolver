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

    private resolveBestMcConfig(mods: ModAndReleases[]): {mcConfig: MCConfig, mods: ModAndRelease[]} {
        
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
