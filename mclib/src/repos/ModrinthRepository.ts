import type { IRepository } from "./IRepository";
import { ModAndReleases, ModReleaseMetadata, ModRepositoryName, ModLoader, ModSearchMetadata } from "../ModpackCreator";

export class ModrinthRepository implements IRepository {

    async getModIdFromHash(hash: string): Promise<string | null> {
        // Modrinth API: https://api.modrinth.com/v2/version_file/{hash}
        const resp = await fetch(`https://api.modrinth.com/v2/version_file/${hash}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.project_id || null;
    }

    async getModReleases(modId: string): Promise<ModAndReleases> {
        const projectResp = await fetch(`https://api.modrinth.com/v2/project/${modId}`);
        if (!projectResp.ok) throw new Error("Mod not found on Modrinth");
        const projectData = await projectResp.json();

        const versionsResp = await fetch(`https://api.modrinth.com/v2/project/${modId}/version`);
        if (!versionsResp.ok) throw new Error("Could not fetch versions from Modrinth");
        const versionsData = await versionsResp.json();

        const releases: ModReleaseMetadata[] = versionsData.map((v: any) => ({
            mcVersions: v.game_versions,
            modVersion: v.version_number,
            repository: ModRepositoryName.MODRINTH,
            loaders: (v.loaders || []).map((l: string) => l as ModLoader),
        }));

        return {
            name: projectData.title || projectData.slug || modId,
            releases,
        };
    }

    async searchMods(query: string, maxResults: number): Promise<ModSearchMetadata[]> {
        const resp = await fetch(`https://api.modrinth.com/v2/search?facets=["project_type:mod"]&query=${encodeURIComponent(query)}&limit=${maxResults}`);
        if (!resp.ok) throw new Error("Failed to fetch search results from Modrinth");
        const data = await resp.json();

        return data.hits.map((hit: any) => ({
            id: hit.slug,
            name: hit.title,
            imageURL: hit.icon_url || "",
            downloadCount: hit.downloads || 0
        }));
    }

    getRepositoryName(): ModRepositoryName {
        return ModRepositoryName.MODRINTH;
    }
}
