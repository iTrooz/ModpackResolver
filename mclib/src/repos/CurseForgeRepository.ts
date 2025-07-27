import type { IRepository } from "./IRepository";
import { ModAndReleases, ModRelease, ModRepositoryName, ModLoader, ModSearchMetadata, MCVersion } from "..";
import { cf_fingerprint } from 'cf-fingerprint';
import { logger } from "../logger";

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
        
        const releases: ModRelease[] = filesData.map((file: any) => {
            const mcVersions: Set<MCVersion> = new Set();
            const loaders: Set<ModLoader> = new Set();
            for (let gameVersion of file.gameVersions || []) {
                gameVersion = gameVersion.toLowerCase();
                if (/^[a-z]+$/.test(gameVersion)) {
                    loaders.add(ModLoader.from(gameVersion));
                } else {
                    mcVersions.add(gameVersion);
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
            id: modId,
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
        const start = Date.now();
        const fingerprint: number = cf_fingerprint(modData);
        const duration = Date.now() - start;
        logger.debug(`cf_fingerprint(${modData.length} bytes): ${duration}ms`);

        // Use the CurseForge API to get file info by fingerprint
        const resp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/fingerprints`, {
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
        const modResp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/mods/${modId}`);
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
