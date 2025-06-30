import type { IRepository } from "./IRepository";
import { ModAndReleases, ModReleaseMetadata, ModRepositoryName, ModLoader, ModSearchMetadata } from "../ModpackCreator";
import { cf_fingerprint } from 'cf-fingerprint';

/**
 * Implementation of IRepository for the CurseForge repository.
 */
export class CurseForgeRepository implements IRepository {
    static BASE_URL = "https://api.curse.tools/v1/cf";

    private fetchClient: typeof fetch;

    constructor(fetchClient: typeof fetch) {
        this.fetchClient = fetchClient;
    }

    async getModIdFromHash(_hash: string): Promise<string | null> {
        // CurseForge does not support hash lookup via public API
        return null;
    }

    async getModReleases(modId: string): Promise<ModAndReleases> {
        const modResp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/mods/${modId}`);
        if (!modResp.ok) throw new Error("Mod not found on CurseForge");
        const modData = (await modResp.json()).data;

        const filesResp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/mods/${modId}/files`);
        if (!filesResp.ok) throw new Error("Could not fetch files from CurseForge");
        const filesData = (await filesResp.json()).data;
        
        const releases: ModReleaseMetadata[] = filesData.map((file: any) => {
            const mcVersions: string[] = [];
            const loaders: ModLoader[] = [];
            for (const d of file.gameVersions || []) {
                const lower = d.toLowerCase();
                if (/^[a-z]+$/.test(lower)) {
                    loaders.push(lower as ModLoader);
                } else {
                    mcVersions.push(lower);
                }
            }

            return ({
                mcVersions: mcVersions,
                modVersion: file.displayName,
                repository: ModRepositoryName.CURSEFORGE,
                loaders: loaders,
            })
        });

        return {
            name: modData.name,
            releases,
        };
    }

    async searchMods(query: string, maxResults: number): Promise<ModSearchMetadata[]> {
        const resp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/mods/search?` + new URLSearchParams({
            // params from PrismLancher
            gameId: "432", // Minecraft game ID
            classId: "6",
            index: "0",
            pageSize: maxResults.toString(),
            sortField: "1",
            sortOrder: "desc",
            searchFilter: query
        }));
        if (!resp.ok) throw new Error("Failed to fetch search results from CurseForge");
        const data = (await resp.json()).data;
        return data.map((mod: any) => ({
            id: mod.id.toString(),
            name: mod.name,
            homepageURL: mod.links.websiteUrl,
            imageURL: mod.logo.url,
            downloadCount: mod.downloadCount || 0
        }));
    }

    async getByDataHash(modData: Uint8Array): Promise<ModSearchMetadata | null> {
        // Calculate CurseForge fingerprint
        const fingerprint: number = cf_fingerprint(modData);

        // Use the CurseForge API to get file info by fingerprint
        const resp = await fetch(`${CurseForgeRepository.BASE_URL}/fingerprints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fingerprints: [fingerprint]
            })
        });

        if (!resp.ok) {
            return null;
        }
        const data = (await resp.json()).data;
        
        if (!data.exactMatches || data.exactMatches.length === 0) return null;

        const fileMatch = data.exactMatches[0];
        const modId: number = fileMatch.file.modId;

        // Get mod info using the mod ID
        const modResp = await fetch(`${CurseForgeRepository.BASE_URL}/mods/${modId}`);
        if (!modResp.ok) return null;
        const modInfo = (await modResp.json()).data;

        return {
            id: modId.toString(),
            name: modInfo.name,
            homepageURL: modInfo.links.websiteUrl,
            imageURL: modInfo.logo?.url || "",
            downloadCount: modInfo.downloadCount || 0
        };
    }

    getRepositoryName(): ModRepositoryName {
        return ModRepositoryName.CURSEFORGE;
    }
}
