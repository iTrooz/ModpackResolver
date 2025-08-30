import { ModMetadata, ModRepoMetadata } from "./types";

export function isSameModAndRepo(modA: ModMetadata, modB: ModRepoMetadata): boolean {
    for (const v of modA) {
        if (isSameModRepo(v, modB)) return true;
    }
    return false;
}

    // Returns true if id OR slug matches id OR slug of the other mod
export function isSameModRepo(modA: ModRepoMetadata, modB: ModRepoMetadata): boolean {
    return [modA.id, modA.slug].some(idA => [modB.id, modB.slug].includes(idA));
}
