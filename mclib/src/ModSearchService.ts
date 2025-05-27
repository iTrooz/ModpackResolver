import type { IRepository } from "./IRepository";
import type { ModRepository, ModSearchMetadata } from "./ModpackCreator";

/**
 * Service for searching mods across multiple repositories.
 */
export class ModSearchService {
    /**
     * Search for mods in the given repositories, rank by download count, and return results.
     * @param query The search query string
     * @param repositories List of repositories to search
     * @param maxResults Maximum number of results to return (optional)
     * @returns Array of [ModRepository, ModSearchMetadata] tuples, ranked by download count
     */
    async searchMods(
        query: string,
        repositories: IRepository[],
        maxResults?: number
    ): Promise<Array<[ModRepository, ModSearchMetadata]>> {
        const allResults: Array<[ModRepository, ModSearchMetadata]> = [];

        for (const repo of repositories) {
            try {
                const repoType = repo.getRepositoryName();
                const results = await repo.searchMods(query);
                for (const mod of results) {
                    allResults.push([repoType, mod]);
                }
            } catch (e) {
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
