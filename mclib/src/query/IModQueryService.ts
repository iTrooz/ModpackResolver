import { MCVersion, ModMetadata, ModReleases, ModRepositoryName } from "../types";

export interface IModQueryService {
    getMinecraftVersions(): Promise<MCVersion[]>;
    searchMods(
        query: string,
        specifiedRepos: ModRepositoryName[],
        maxResults: number,
    ): Promise<ModMetadata[]>;
    getModReleasesFromMetadata(modMeta: ModMetadata): Promise<ModReleases>;
    getModByDataHash(modData: Uint8Array): Promise<ModMetadata>;
}
