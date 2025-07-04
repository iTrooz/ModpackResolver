// simple types

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

/** Represents a Minecraft version */
export type MCVersion = string;

/** Represents a Minecraft configuration with mc version and loader */
export type MCConfig = {
    mcVersion: MCVersion;
    loader: ModLoader;
};

/** Represents a release of a mod */
export type ModReleaseMetadata = {
    /** List of Minecraft versions compatible with this release */
    mcVersions: MCVersion[];
    /** Mod version */
    modVersion: string;
    /** Repository where the release is available */
    repository: ModRepositoryName;
    /** Compatible mod loaders */
    loaders: ModLoader[];
};

/** Represents metadata for a mod search result. */
export type ModSearchMetadata = {
    id: string;
    name: string; // user-facing name
    homepageURL: string;
    imageURL: string;
    downloadCount: number;
};

/** Unresolved mod that needs to be processed */
export type UnresolvedMod = {
    /** Type of source identifier */
    source: ModSourceType;
    /** Data specific to the source type */
    data: string;
};

export type ModAndRelease = {
    name: string;
    release: ModReleaseMetadata;
}

/** Mod with all its available releases */
export type ModAndReleases = {
    /** Mod name */
    name: string;
    /** Available releases of the mod */
    releases: ModReleaseMetadata[];
};

/** Solution to run the modpack, using the given Minecraft version/loader, and the mod releases to use */
export type Solution = {
    /** The Minecraft configuration */
    mcConfig: MCConfig;
    /** The mod releases that are compatible with this configuration */
    mods: ModAndRelease[];
};
