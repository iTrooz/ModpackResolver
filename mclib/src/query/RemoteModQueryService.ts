import { IRepository } from "..";
import { MCVersion, ModRepositoryName, ModRepoMetadata, ModMetadata, ModReleases } from "../types";
import { IModQueryService } from "./IModQueryService";

export class RemoteModQueryService implements IModQueryService {
    private fetchClient: typeof fetch;
    private serverUrl: string;
    private repositories: IRepository[];

    constructor(fetchClient: typeof fetch, serverUrl: string, repositories: IRepository[]) {
        this.fetchClient = fetchClient;
        this.serverUrl = serverUrl;
        this.repositories = repositories;
    }

    private async callEndpoint(method: string, params: any): Promise<any> {
        const resp = await this.fetchClient(`${this.serverUrl}/${method}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        });
        if (!resp.ok) throw new Error(`Failed to call ${method}`);
        return await resp.json();
    }

    async getMinecraftVersions(): Promise<MCVersion[]> {
        return this.callEndpoint("getMinecraftVersions", {});
    }

    async searchMods(
        query: string,
        specifiedRepos: ModRepositoryName[],
        maxResults: number
    ): Promise<Array<[ModRepositoryName, ModRepoMetadata]>> {
        return this.callEndpoint("searchMods", { query, specifiedRepos, maxResults });
    }

    async getModReleasesFromMetadata(modMeta: ModMetadata): Promise<ModReleases> {
        let releases = await this.callEndpoint("getModReleasesFromMetadata", { modMeta });
        // Convert arrays back to sets
        for (let release of releases) {
            release.mcVersions = new Set(release.mcVersions);
            release.loaders = new Set(release.loaders);
        }
        return releases;
    }

    async getModByDataHash(modData: Uint8Array): Promise<ModMetadata> {
        const results: ModMetadata = [];
        for (const repo of this.repositories) {
            const hash = await repo.hashModData(modData);
            if (hash) {
                const resp: ModRepoMetadata = await this.callEndpoint("getModByDataHash", { hash, repository: repo.getRepositoryName() });
                if (resp) results.push(resp);
            }
        }
        return results;
    }

    async getModById(modId: string): Promise<any> {
        return this.callEndpoint("getModById", { modId });
    }
}
