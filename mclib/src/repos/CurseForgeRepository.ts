import type { IRepository } from "./IRepository";
import { RawModRepoRelease, ModRepositoryName, ModLoader, ModRepoMetadata, MCVersion } from "..";
import { cf_fingerprint } from 'cf-fingerprint';
import { logger } from "../logger";

// Translation map for Curseforge modloader IDs
// Source: https://docs.curseforge.com/rest-api/#tocS_ModLoaderType
const LOADERS: { [key: number]: ModLoader } = {
    1: ModLoader.FORGE,
    4: ModLoader.FABRIC,
    5: ModLoader.QUILT,
    6: ModLoader.NEOFORGE
}

/**
 * Implementation of IRepository for the CurseForge repository.
 */
export class CurseForgeRepository implements IRepository {
    static BASE_URL = "https://api.curse.tools/v1/cf";

    private fetchClient: typeof fetch;

    constructor(fetchClient: typeof fetch) {
        this.fetchClient = fetchClient;
    }

    async getModReleases(modId: string): Promise<RawModRepoRelease[]> {
        const modInfo = await this.fetchModInfo(Number(modId));
        if (!modInfo || !modInfo.latestFilesIndexes) return [];

        const releases: RawModRepoRelease[] = modInfo.latestFilesIndexes.map(file => {
            const mcVersions: Set<MCVersion> = new Set();
            const loaders: Set<ModLoader> = new Set();
            if (file.gameVersion) mcVersions.add(file.gameVersion);
            if (file.modLoader && LOADERS[file.modLoader]) loaders.add(LOADERS[file.modLoader]);

            return {
                mcVersions: mcVersions,
                modVersion: file.filename,
                repository: ModRepositoryName.CURSEFORGE,
                loaders: loaders,
                downloadUrl: '', // No downloadUrl in latestFilesIndexes, could be fetched if needed
            };
        });

        return releases;
    }

    async searchMods(query: string, maxResults: number): Promise<ModRepoMetadata[]> {
        type Data = {
            data: {
                id: number;
                slug: string;
                name: string;
                links: {
                    websiteUrl: string;
                };
                logo: {
                    url: string;
                };
                downloadCount: number;
            }[];
        };

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
        const jsonResp: Data = (await resp.json());

        return jsonResp.data.map(mod => ({
            repository: ModRepositoryName.CURSEFORGE,
            id: mod.id.toString(),
            slug: mod.slug,
            name: mod.name,
            homepageURL: mod.links.websiteUrl,
            imageURL: mod.logo.url,
            downloadCount: mod.downloadCount || 0
        }));
    }

    private async fetchModInfo(modId: number): Promise<ModInfoData | null> {
        const modResp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/mods/${modId}`);
        if (!modResp.ok) return null;
        return (await modResp.json()).data as ModInfoData;
    }

    async getByDataHash(hash: string): Promise<ModRepoMetadata | null> {
        // Use the CurseForge API to get file info by fingerprint
        const resp = await this.fetchClient(`${CurseForgeRepository.BASE_URL}/fingerprints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fingerprints: [parseInt(hash)]
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
        const modInfo = await this.fetchModInfo(modId);
        if (!modInfo) return null;

        return {
            repository: ModRepositoryName.CURSEFORGE,
            id: modId.toString(),
            slug: modInfo.slug,
            name: modInfo.name,
            homepageURL: modInfo.links.websiteUrl,
            imageURL: modInfo.logo?.url || "",
            downloadCount: modInfo.downloadCount || 0
        };
    }

    async hashModData(modData: Uint8Array): Promise<string> {
        const start = Date.now();
        const fingerprint: number = cf_fingerprint(modData);
        const duration = Date.now() - start;
        logger.debug(`cf_fingerprint(${modData.length} bytes): ${duration}ms`);
        return fingerprint.toString();
    }

    getRepositoryName(): ModRepositoryName {
        return ModRepositoryName.CURSEFORGE;
    }
}

type ModInfoData = {
    id: number;
    slug: string;
    name: string;
    links: {
        websiteUrl: string;
    };
    logo?: {
        url?: string;
    };
    downloadCount?: number;
    latestFilesIndexes?: {
        gameVersion: string;
        fileId: number;
        filename: string;
        modLoader?: number;
    }[];
};
