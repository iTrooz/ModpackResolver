import type { IRepository } from "./IRepository";
import { ModAndReleases, ModReleaseMetadata, ModRepositoryName, ModLoader, ModSearchMetadata } from "../ModpackCreator";

/**
 * Implementation of IRepository for the CurseForge repository.
 */
export class CurseForgeRepository implements IRepository {
    static BASE_URL = "https://api.curse.tools/v1/cf";

    async getModIdFromHash(hash: string): Promise<string | null> {
        // CurseForge does not support hash lookup via public API
        return null;
    }

    async getModReleases(modId: string): Promise<ModAndReleases> {
        // Use BASE_URL for all endpoints
        const modResp = await fetch(`${CurseForgeRepository.BASE_URL}/mods/${modId}`);
        if (!modResp.ok) throw new Error("Mod not found on CurseForge");
        const modData = (await modResp.json()).data;

        const filesResp = await fetch(`${CurseForgeRepository.BASE_URL}/mods/${modId}/files`);
        if (!filesResp.ok) throw new Error("Could not fetch files from CurseForge");
        const filesData = (await filesResp.json()).data;

        const releases: ModReleaseMetadata[] = filesData.map((file: any) => ({
            mcVersions: file.gameVersions || [],
            modVersion: file.displayName,
            repository: ModRepositoryName.CURSEFORGE,
            loaders: (file.gameVersions || []).map((v: string) => v.toLowerCase() as ModLoader
            ) as ModLoader[],
        }));

        return {
            name: modData.name,
            releases,
        };
    }

    async searchMods(query: string, maxResults: number): Promise<ModSearchMetadata[]> {
        const resp = await fetch(`${CurseForgeRepository.BASE_URL}/mods/search?` + new URLSearchParams({
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
            imageURL: mod.logo?.url || "",
            downloadCount: mod.downloadCount || 0
        }));
    }

    getRepositoryName(): ModRepositoryName {
        return ModRepositoryName.CURSEFORGE;
    }
}
