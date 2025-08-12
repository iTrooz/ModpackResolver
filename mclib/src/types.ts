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

export class ModLoaderUtil {
    static from(loader: string): ModLoader {
        loader = loader.toLowerCase();
        for (const modLoader of Object.values(ModLoader)) {
            if (modLoader === loader) {
                return modLoader as ModLoader;
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
export type ModRepoRelease = {
    /** List of Minecraft versions compatible with this release */
    mcVersions: Set<MCVersion>;
    /** Mod version */
    modVersion: string;
    /** Repository where the release is available */
    repository: ModRepositoryName;
    /** Compatible mod loaders */
    loaders: Set<ModLoader>;
    /** Download URL for the mod release */
    downloadUrl: string;

    modMetadata: ModRepoMetadata;
};

export type ModMetadata = ModRepoMetadata[];

export class ModMetadataUtil {
    static toString(modMeta: ModMetadata): string {
        return modMeta.map(m => `${m.repository}|${m.id}`).join(", ");
    }
}

/** Represents metadata for a mod search result, for a given repository */
export type ModRepoMetadata = {
    id: string;
    repository: ModRepositoryName;
    name: string; // user-facing name
    homepageURL: string;
    imageURL: string;
    downloadCount: number;
};

export type ModReleases = ModRepoRelease[]

/** Solution to run the modpack, using the given Minecraft version/loader, and the mod releases to use */
export type Solution = {
    /** The Minecraft configuration */
    mcConfig: MCConfig;
    /** The mod releases that are compatible with this configuration */
    mods: ModRepoRelease[];
};

/** Represents constraints for a modpack solution */
export class Constraints {
    minVersion?: MCVersion;
    maxVersion?: MCVersion;
    loaders?: Set<ModLoader>;
}
