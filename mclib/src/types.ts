// simple types

import { logger } from "./logger";

export enum ModRepositoryName {
    MODRINTH = "modrinth",
    CURSEFORGE = "curseforge",
    FTB = "ftb",
    CUSTOM = "custom"
}

export enum ModSourceType {
    ID = "id"
}

export enum ModLoader {
    FORGE = "forge",
    FABRIC = "fabric",
    QUILT = "quilt",
    NEOFORGE = "neoforge"
}

export namespace ModLoader {
    export function from(loader: string): ModLoader {
        loader = loader.toLowerCase();
        for (const modLoader of Object.values(ModLoader)) {
            if (modLoader === loader) {
                return modLoader;
            }
        }
        logger.trace(`Unknown mod loader: ${loader}`);
        return loader as ModLoader;
    }
}

/** Represents a Minecraft version */
export type MCVersion = string;

/** Represents a Minecraft configuration with mc version and loader */
export type MCConfig = {
    mcVersion: MCVersion;
    loader: ModLoader;
};

/** Represents a release of a mod */
export type ModRelease = {
    /** List of Minecraft versions compatible with this release */
    mcVersions: Set<MCVersion>;
    /** Mod version */
    modVersion: string;
    /** Repository where the release is available */
    repository: ModRepositoryName;
    /** Compatible mod loaders */
    loaders: Set<ModLoader>;
};

/** Represents metadata for a mod search result. */
export type ModSearchMetadata = {
    id: string;
    name: string; // user-facing name
    homepageURL: string;
    imageURL: string;
    downloadCount: number;
};

export type ModAndRelease = {
    id: string;
    release: ModRelease;
}

/** Mod with all its available releases */
export type ModAndReleases = {
    /** Mod ID */
    id: string;
    /** Available releases of the mod */
    releases: ModRelease[];
};

/** Solution to run the modpack, using the given Minecraft version/loader, and the mod releases to use */
export type Solution = {
    /** The Minecraft configuration */
    mcConfig: MCConfig;
    /** The mod releases that are compatible with this configuration */
    mods: ModAndRelease[];
};

/** Represents constraints for a modpack solution */
export class Constraints {
    minVersion?: MCVersion;
    maxVersion?: MCVersion;
    loaders?: Set<ModLoader>;
}
