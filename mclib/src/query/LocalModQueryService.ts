import { type MCVersion, type ModRepositoryName, type IRepository, type ModMetadata, type ModReleases, ModMetadataUtil, IModQueryService } from "..";
import { logger } from "../logger";
import { isSameModAndRepo } from "../utils";

export class LocalModQueryService implements IModQueryService {

    private repositories: IRepository[];

    constructor(repositories: IRepository[]) {
        this.repositories = repositories;
    }

    async getMinecraftVersions(): Promise<MCVersion[]> {
        const response = await fetch("https://mc-versions-api.net/api/java");
        const data = await response.json();
        return data.result.reverse();
    }

    /**
     * Searches mods across multiple repositories, and return aggregated results, ranked by download count.
     */
    async searchMods(
        query: string,
        specifiedRepos: ModRepositoryName[],
        maxResults: number,
    ): Promise<ModMetadata[]> {
        const allResults: Array<ModMetadata> = [];

        for (const repo of this.repositories) {
            try {
                const repoName = repo.getRepositoryName();
                if (specifiedRepos.length > 0 && !specifiedRepos.includes(repoName)) {
                    continue; // Skip repositories not in the specified list
                }

                // Loop over search results of this repository
                for (const newModRepo of await repo.searchMods(query, maxResults)) {
                    
                    // Check if this mod already exists in the aggregated results
                    let wasMerged = false;
                    for (const existingMod of allResults) {
                        if (isSameModAndRepo(existingMod, newModRepo)) {
                            // Update existing mod entry with additional repository metadata
                            existingMod.push(newModRepo);
                            wasMerged = true;
                            break;
                        }
                    }
                    if (!wasMerged) allResults.push([newModRepo]); // Add as new entry
                }
            } catch (_) {
                // Ignore errors for individual repositories
            }
        }

        // Sort by download count descending
        allResults.sort((a, b) => b[0].downloadCount - a[0].downloadCount);

        // Limit results if maxResults is specified
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
                const rawRepoReleases = await repo.getModReleases(modRepoMeta.id);
                // Attach the metadata to the release
                const repoReleases = rawRepoReleases.map(release => ({ ...release, modMetadata: modRepoMeta }));
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
                const result = await repo.getByDataHash(await repo.hashModData(modData));
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
