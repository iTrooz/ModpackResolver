import type { IRepository } from "./IRepository";
import { ModAndReleases, ModRelease, ModRepositoryName, ModLoader, ModSearchMetadata } from "..";

export class ModrinthRepository implements IRepository {

    private fetchClient: typeof fetch;

    constructor(fetchClient: typeof fetch) {
        this.fetchClient = fetchClient;
    }

    async getModIdFromHash(hash: string): Promise<string | null> {
        // Modrinth API: https://api.modrinth.com/v2/version_file/{hash}
        const resp = await this.fetchClient(`https://api.modrinth.com/v2/version_file/${hash}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.project_id || null;
    }

    async getModReleases(modId: string): Promise<ModAndReleases> {
        const projectResp = await this.fetchClient(`https://api.modrinth.com/v2/project/${modId}`);
        if (!projectResp.ok) throw new Error("Mod not found on Modrinth");
        const projectData = await projectResp.json();

        const versionsResp = await this.fetchClient(`https://api.modrinth.com/v2/project/${modId}/version`);
        if (!versionsResp.ok) throw new Error("Could not fetch versions from Modrinth");
        const versionsData = await versionsResp.json();

        const releases: ModRelease[] = versionsData.map((v: any) => ({
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
        const resp = await this.fetchClient(`https://api.modrinth.com/v2/search?facets=[["project_type:mod"]]&query=${encodeURIComponent(query)}&limit=${maxResults}`);
        if (!resp.ok) throw new Error("Failed to fetch search results from Modrinth");
        const data = await resp.json();

        return data.hits.map((hit: any) => ({
            id: hit.slug,
            name: hit.title,
            homepageURL: "https://modrinth.com/mod/" + hit.slug,
            imageURL: hit.icon_url || "",
            downloadCount: hit.downloads || 0
        }));
    }

    async getByDataHash(modData: Uint8Array): Promise<ModSearchMetadata | null> {
        // Calculate SHA-1 hash of the mod data for Modrinth
        const hash = await this.calculateSHA1(modData);
        
        // Get version info using the hash
        const versionResp = await fetch(`https://api.modrinth.com/v2/version_file/${hash}`);
        if (!versionResp.ok) return null;
        const versionData = await versionResp.json();
        
        // Get project info using the project ID
        const projectResp = await fetch(`https://api.modrinth.com/v2/project/${versionData.project_id}`);
        if (!projectResp.ok) return null;
        const projectData = await projectResp.json();
        
        return {
            id: projectData.slug,
            name: projectData.title,
            homepageURL: "https://modrinth.com/mod/" + projectData.slug,
            imageURL: projectData.icon_url || "",
            downloadCount: projectData.downloads || 0
        };
    }

    private async calculateSHA1(data: Uint8Array): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getRepositoryName(): ModRepositoryName {
        return ModRepositoryName.MODRINTH;
    }
}
