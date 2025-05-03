import type { IRepository } from "./IRepository";
import type { ModAndReleases, ModReleaseMetadata, ModRepository, ModLoader, ModSearchMetadata } from "./ModpackCreator";

/**
 * Implementation of IRepository for the Modrinth repository.
 */
export class ModrinthRepository implements IRepository {
    /**
     * Get the mod ID from a file hash using the Modrinth API.
     * @param hash The hash of the mod file.
     * @returns A promise resolving to the mod ID, or null if not found.
     */
    async getModIdFromHash(hash: string): Promise<string | null> {
        // Modrinth API: https://api.modrinth.com/v2/version_file/{hash}
        const resp = await fetch(`https://api.modrinth.com/v2/version_file/${hash}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.project_id || null;
    }

    /**
     * Get all releases for a mod by its ID using the Modrinth API.
     * @param modId The ID of the mod.
     * @returns A promise resolving to ModAndReleases.
     */
    async getModReleases(modId: string): Promise<ModAndReleases> {
        // Modrinth API: https://api.modrinth.com/v2/project/{modId}
        const projectResp = await fetch(`https://api.modrinth.com/v2/project/${modId}`);
        if (!projectResp.ok) throw new Error("Mod not found on Modrinth");
        const projectData = await projectResp.json();

        // Modrinth API: https://api.modrinth.com/v2/project/{modId}/version
        const versionsResp = await fetch(`https://api.modrinth.com/v2/project/${modId}/version`);
        if (!versionsResp.ok) throw new Error("Could not fetch versions from Modrinth");
        const versionsData = await versionsResp.json();

        const releases: ModReleaseMetadata[] = versionsData.map((v: any) => ({
            mcVersions: v.game_versions,
            modVersion: v.version_number,
            repository: "modrinth" as ModRepository,
            loaders: (v.loaders || []).map((l: string) => l as ModLoader),
        }));

        return {
            name: projectData.title || projectData.slug || modId,
            releases,
        };
    }

    /**
     * Search for mods by a query string using the Modrinth API.
     * @param query The search query.
     * @returns A promise resolving to an array of ModSearchMetadata.
     */
    async searchMods(query: string): Promise<ModSearchMetadata[]> {
        // Modrinth API: https://api.modrinth.com/v2/search
        const resp = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}`);
        if (!resp.ok) throw new Error("Failed to fetch search results from Modrinth");
        const data = await resp.json();

        return data.hits.map((hit: any) => ({
            name: hit.title,
            imageURL: hit.icon_url || "",
            downloadCount: hit.downloads || 0
        }));
    }
}