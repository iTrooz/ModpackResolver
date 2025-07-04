import type { IRepository } from "./repos/IRepository";
import type { MCVersion, ModAndReleases, ModRepositoryName, ModSearchMetadata } from "./ModpackCreator";

export class ModQueryService {

    private repositories: IRepository[];

    constructor(repositories: IRepository[]) {
        this.repositories = repositories;
    }

    async getMinecraftVersions(): Promise<MCVersion[]> {
    try {
      const response = await fetch("https://mc-versions-api.net/api/java");
      const data = await response.json();
      return data.result.reverse();
    } catch (error) {
      console.error("Failed to fetch Minecraft versions:", error);
      return ["error"];
    }
  }

    /**
     * Searches mods across multiple repositories, and return aggregated results, ranked by download count.
     */
    async searchMods(
        query: string,
        specifiedRepos: ModRepositoryName[],
        maxResults: number = 10,
    ): Promise<Array<[ModRepositoryName, ModSearchMetadata]>> {
        const allResults: Array<[ModRepositoryName, ModSearchMetadata]> = [];

        for (const repo of this.repositories) {
            try {
                const repoName = repo.getRepositoryName();
                if (specifiedRepos.length > 0 && !specifiedRepos.includes(repoName)) {
                    continue; // Skip repositories not in the specified list
                }

                const results = await repo.searchMods(query, maxResults);
                for (const mod of results) {
                    allResults.push([repoName, mod]);
                }
            } catch (_) {
                // Ignore errors for individual repositories
            }
        }

        // Sort by download count descending
        allResults.sort((a, b) => b[1].downloadCount - a[1].downloadCount);

        if (maxResults !== undefined) {
            return allResults.slice(0, maxResults);
        }
        return allResults;
    }

    // TODO do better
    async getModReleases(modId: string): Promise<ModAndReleases> {
        for (const repo of this.repositories) {
            // Try to get releases for this mod ID
            try {
                return await repo.getModReleases(modId);
            } catch {
                // Ignore and try next repository
                // TODO handle error
            }
        }
        throw new Error(`Mod with ID ${modId} not found in any repository`);
    }
}
