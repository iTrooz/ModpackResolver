import type { IRepository } from "./repos/IRepository";
import type { ModRepositoryName, ModSearchMetadata } from "./ModpackCreator";

export class ModSearchService {
    /**
     * Searches mods across multiple repositories, and return aggregated results, ranked by download count.
     */
    async searchMods(
        query: string,
        repositories: IRepository[],
        maxResults: number = 10,
    ): Promise<Array<[ModRepositoryName, ModSearchMetadata]>> {
        const allResults: Array<[ModRepositoryName, ModSearchMetadata]> = [];

        for (const repo of repositories) {
            try {
                const repoType = repo.getRepositoryName();
                const results = await repo.searchMods(query, maxResults);
                for (const mod of results) {
                    allResults.push([repoType, mod]);
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
}
