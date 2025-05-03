import type { ModAndReleases } from "./ModpackCreator";

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
    getModReleases(modId: string): Promise<ModAndReleases>;
}
