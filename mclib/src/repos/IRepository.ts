import type { ModRepoMetadata, ModRepositoryName, RawModRepoRelease } from "..";

/**
 * Interface for a mod repository
 */
export interface IRepository {
    /**
     * Get the mod ID from a file hash.
     * @param hash The hash of the mod file.
     * @returns A promise resolving to the mod ID, or null if not found.
     */
    getModIdFromHash(hash: string): Promise<string | null>;

    /**
     * Get all releases for a mod by its ID.
     * @param modId The ID of the mod.
     * @returns A promise resolving to an array of mod releases.
     */
    getModReleases(modId: string): Promise<RawModRepoRelease[]>;

    /**
     * Search for mods by a query string.
     * @param query The search query.
     * @returns A promise resolving to an array of mods matching the query.
     */
    searchMods(query: string, maxResults: number): Promise<ModRepoMetadata[]>;

    /**
     * Get mod information by file hash/fingerprint from mod file bytes.
     * @param hash The hash provided by hashModData().
     * @returns A promise resolving to mod search metadata, or null if not found.
     */
    getByDataHash(hash: string): Promise<ModRepoMetadata | null>;

    /**
     * Returns the repository name (ModRepositoryName enum value)
     */
    getRepositoryName(): ModRepositoryName;

    /**
     * Get the hash of the mod data.
     * @param modData The mod file data as bytes.
     * @returns The hash of the mod data.
     */
    hashModData(modData: Uint8Array): Promise<string>;
}
