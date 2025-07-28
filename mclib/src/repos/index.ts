import { logger } from "../logger";
import { ModRepositoryName } from "../types";
import { CurseForgeRepository } from "./CurseForgeRepository";
import { IRepository } from "./IRepository";
import { ModrinthRepository } from "./ModrinthRepository";

export { ModrinthRepository } from "./ModrinthRepository";
export { CurseForgeRepository } from "./CurseForgeRepository";
export type { IRepository } from "./IRepository";

export class RepositoryUtil {
    static from(repo: ModRepositoryName, fetchClient: typeof fetch): IRepository | undefined {
        switch (repo.toLowerCase()) {
            case "modrinth":
                return new ModrinthRepository(fetchClient);
            case "curseforge":
                return new CurseForgeRepository(fetchClient);
            default: {
                logger.error(`RepositoryUtil::from(%s): Unknown repository`, repo);
                return undefined;
            }
        }
    }
}
