import { CurseForgeRepository, IRepository, ModRepositoryName, ModrinthRepository } from "..";

export function createModRepository(name: ModRepositoryName, fetchClient: typeof fetch): IRepository | null {
    switch (name.toLowerCase()) {
        case ModRepositoryName.MODRINTH:
            return new ModrinthRepository(fetchClient);
        case ModRepositoryName.CURSEFORGE:
            return new CurseForgeRepository(fetchClient);
        default:
            return null;
    }
}
