import type { IRepository } from "./IRepository";
import { ModRepositoryName, ModRepoMetadata, ModLoaderUtil, RawModRepoRelease } from "..";

// https://devblogs.microsoft.com/typescript/announcing-typescript-5-9-rc/#notable-behavioral-changes
function toArrayBuffer(buf: ArrayBufferLike): ArrayBuffer {
  if (buf instanceof ArrayBuffer) return buf;
  // SharedArrayBuffer → copy into a new ArrayBuffer
  const copy = new Uint8Array(buf.byteLength);
  copy.set(new Uint8Array(buf));
  return copy.buffer;
}


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

    async getModReleases(modId: string): Promise<RawModRepoRelease[]> {
        type Data = Array<{
            game_versions: string[];
            version_number: string;
            loaders: string[];
            files: {
                url: string;
            }[];
        }>;

        const versionsResp = await this.fetchClient(`https://api.modrinth.com/v2/project/${modId}/version`);
        if (!versionsResp.ok) throw new Error("Could not fetch versions from Modrinth");
        const jsonResp: Data = await versionsResp.json();

        const releases: RawModRepoRelease[] = jsonResp.map(file => {
            const mcVersions = new Set(file.game_versions);
            const loaders = new Set(file.loaders.map(ModLoaderUtil.from));
            return {
                mcVersions,
                modVersion: file.version_number,
                repository: ModRepositoryName.MODRINTH,
                loaders,
                downloadUrl: file.files?.[0]?.url || '',
            };
        });

        return releases;
    }

    async searchMods(query: string, maxResults: number): Promise<ModRepoMetadata[]> {
        type Data = {
            hits: Array<{
                slug: string;
                title: string;
                icon_url?: string;
                downloads?: number;
            }>;
        };

        const resp = await this.fetchClient(`https://api.modrinth.com/v2/search?facets=[[\"project_type:mod\"]]&query=${encodeURIComponent(query)}&limit=${maxResults}`);
        if (!resp.ok) throw new Error("Failed to fetch search results from Modrinth");
        const jsonResp: Data = await resp.json();

        return jsonResp.hits.map(hit => ({
            repository: ModRepositoryName.MODRINTH,
            id: hit.slug,
            slug: hit.slug,
            name: hit.title,
            homepageURL: "https://modrinth.com/mod/" + hit.slug,
            imageURL: hit.icon_url || "",
            downloadCount: hit.downloads || 0
        }));
    }

    async getByDataHash(modData: Uint8Array): Promise<ModRepoMetadata | null> {
        // Calculate SHA-1 hash of the mod data for Modrinth
        const hash = await this.calculateSHA1(modData);

        // Get version info using the hash
        const versionResp = await this.fetchClient(`https://api.modrinth.com/v2/version_file/${hash}`);
        if (!versionResp.ok) return null;
        const versionData = await versionResp.json();

        // Get project info using the project ID
        const projectResp = await this.fetchClient(`https://api.modrinth.com/v2/project/${versionData.project_id}`);
        if (!projectResp.ok) return null;
        const projectData = await projectResp.json();

        return {
            repository: ModRepositoryName.MODRINTH,
            id: projectData.slug,
            slug: projectData.slug,
            name: projectData.title,
            homepageURL: "https://modrinth.com/mod/" + projectData.slug,
            imageURL: projectData.icon_url || "",
            downloadCount: projectData.downloads || 0
        };
    }

    private async calculateSHA1(data: Uint8Array): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-1', toArrayBuffer(data.buffer));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getRepositoryName(): ModRepositoryName {
        return ModRepositoryName.MODRINTH;
    }
}
