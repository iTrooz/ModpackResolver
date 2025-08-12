import { type MCVersion, type ModRepositoryName, type ModRepoMetadata, type IRepository, type ModMetadata, type ModReleases, ModMetadataUtil } from ".";
import { logger } from "./logger";

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
    ): Promise<Array<[ModRepositoryName, ModRepoMetadata]>> {
        const allResults: Array<[ModRepositoryName, ModRepoMetadata]> = [];

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

    private getRepoByName(repoName: ModRepositoryName): IRepository | null {
        for (const repo of this.repositories) {
            if (repo.getRepositoryName() === repoName) {
                return repo;
            }
        }
        return null;
    }

    // get releases of this mod across all repositories, using all metadata provided
    async getModReleasesFromMetadata(modMeta: ModMetadata): Promise<ModReleases> {
        logger.debug("getModReleasesFromMetadata(%s)", ModMetadataUtil.toString(modMeta));
        const releases: ModReleases = [];
        for (const modRepoMeta of modMeta) {
            const repo = this.getRepoByName(modRepoMeta.repository);
            if (!repo) {
                logger.warn("getModReleasesFromMetadata(%s): Repository %s not found", modRepoMeta.id, modRepoMeta.repository);
                continue;
            }
            // Try to get releases for this mod ID
            try {
                const repoReleases = await repo.getModReleases(modRepoMeta.id);
                // Attach the metadata to the release
                repoReleases.forEach(release => {
                    release.modMetadata = modRepoMeta;
                });
                releases.push(...repoReleases);
            } catch (error) {
                logger.error("Error fetching mod releases for %s from %s: %s", modRepoMeta.id, repo.getRepositoryName(), error);
            }
        }
        logger.debug("getModReleasesFromMetadata(%s) = %d releases found", ModMetadataUtil.toString(modMeta), releases.length);
        return releases;
    }

    async getModByDataHash(modData: Uint8Array): Promise<ModMetadata> {
        const results: ModMetadata = [];
        for (const repo of this.repositories) {
            logger.debug("getModByDataHash(size = %s, %s)", modData.length, repo.getRepositoryName())
            try {
                const result = await repo.getByDataHash(modData);
                if (result) {
                    logger.debug("getModByDataHash(size = %s, %s) = %s (%s)", modData.length, repo.getRepositoryName(), result.id, result.name);
                    results.push(result);
                } else {
                    logger.trace("getModByDataHash(size = %s, %s) = not found", modData.length, repo.getRepositoryName());
                }
            } catch (error) {
                logger.error("Error fetching mod by hash from %s: %s", repo.getRepositoryName(), error);
            }
        }
        logger.debug("getModByDataHash(size = %s) = found in %s repositories", modData.length, results.length);
        return results
    }
}
