#!/usr/bin/env bun

import { program, Option } from '@commander-js/extra-typings';
import { CurseForgeRepository, LocalSolutionFinder, LoggerConfig, ModLoader, ModQueryService, ModrinthRepository, LogLevel, Constraints, Solution, ModMetadata, RepositoryUtil, ModRepositoryName, ModRepoMetadata } from 'mclib';
import { readFileSync } from 'fs';
import pino from 'pino';

// Logging setup
const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info") as LogLevel;
const logger = pino({
  level: LOG_LEVEL,
  base: {
    pid: false,
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});
LoggerConfig.setLevel(LOG_LEVEL);

// Fetch wrapper to log timing and errors
async function fetchWrapper(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const start = Date.now();
  const response = await fetch(input, options);
  const duration = Date.now() - start;
  logger.debug(`fetch(${input}): ${duration}ms`);
  if (!response.ok) {
    logger.error(`Fetch failed for ${input}: ${response.status} ${response.statusText}`);
  }
  return response;
}

function getModQueryService(selectedRepos?: string[]) {
  const repoMap = {
    modrinth: () => new ModrinthRepository(fetchWrapper),
    curseforge: () => new CurseForgeRepository(fetchWrapper),
  };
  let repositories: any[] = [];
  if (selectedRepos && selectedRepos.length > 0) {
    for (const repo of selectedRepos) {
      const factory = repoMap[repo.toLowerCase() as keyof typeof repoMap];
      if (factory) repositories.push(factory());
      else {
        logger.error(`Unknown repository: ${repo}`);
        process.exit(1);
      }
    }
  } else {
    repositories = [new ModrinthRepository(fetchWrapper), new CurseForgeRepository(fetchWrapper)];
  }
  return new ModQueryService(repositories);
}

interface CliOptions {
  modId?: string[];
  modFile?: string[];
  exactVersion?: string;
  minVersion?: string;
  maxVersion?: string;
  loader?: string[];
  details: boolean;
  nbSolutions: number;
  sinytra: boolean;
}

function validateCliOptions(options: CliOptions) {
  if ((!options.modId || options.modId.length === 0) && (!options.modFile || options.modFile.length === 0)) {
    throw new Error('At least one --mod-id or --mod-file is required.');
  }
}

async function getMods(modQueryService: ModQueryService, options: CliOptions): Promise<ModMetadata[]> {
  const modsMap = new Map<string, ModMetadata>();

  if (options.modId) {
    for (const repoAndId of options.modId) {
      let [repoName, modId] = repoAndId.split('/');
      if (!modId) {
        logger.error(`Invalid mod ID format: ${repoAndId}. Expected format is 'repository/modId'.`);
        continue;
      }

      let repo = RepositoryUtil.from(repoName as ModRepositoryName, fetch);
      if (!repo) {
        logger.error(`Unknown repository: ${repoName}`);
        continue;
      }

      // Rebuild mod ID to ensure user input doesn't mess things up
      let fullId = `${repo.getRepositoryName()}/${modId}`.toLowerCase();

      // Add mod to map
      if (modsMap.has(fullId)) {
        logger.warn(`Duplicate mod ID from --mod-id: ${repoAndId}`);
      } else {
        modsMap.set(fullId, [{
          repository: repo.getRepositoryName(),
          id: modId,
          slug: repoAndId,
          name: repoAndId,
          homepageURL: "",
          imageURL: "",
          downloadCount: 0
        }]);
      }
    }
  }

  if (options.modFile) {
    for (const file of options.modFile) {
      try {
        // Read file
        const start = Date.now();
        let modData = readFileSync(file);
        const duration = Date.now() - start;
        logger.debug(`readFileSync(${file}): ${duration}ms`);

        // Get metadata
        let modMetadatas = await modQueryService.getModByDataHash(new Uint8Array(modData));
        if (modMetadatas.length === 0) {
          logger.warn(`Could not extract mod ID from file: ${file}`);
          continue;
        }
        logger.debug(`Extracted ${modMetadatas.length} match in repositories from file: ${file}`);

        // verify if there are duplicates
        for (const modMetadata of modMetadatas) {
          let fullId = `${modMetadata.repository}|${modMetadata.id}`.toLowerCase();
          if (modsMap.has(fullId)) {
            logger.warn(`Duplicate mod ID from file: ${modMetadata.id} (file: ${file})`);
          }
        }

        // add to set (with random key, we don't care anyway)
        modsMap.set(`|${modMetadatas[0].id}`, modMetadatas);
      } catch (error) {
        logger.error(`Error processing mod file ${file}: ${error}`);
        continue;
      }
    }
  }

  return Array.from(modsMap.values());
}

async function findSolutions(
  modQueryService: ModQueryService,
  requestedMods: ModMetadata[],
  constraints: Constraints,
  nbSolutions: number,
  sinytra: boolean
): Promise<Solution[]> {
  let solutionFinder = new LocalSolutionFinder(modQueryService);

  // Resolve mods
  const mods = await solutionFinder.resolveMods(requestedMods);

  // Sinytra loader injection
  if (sinytra) {
    logger.info('Sinytra mode: Injecting Forge and NeoForge into Fabric-compatible releases...');
    for (const mod of mods) {
      for (const release of mod) {
        if (release.loaders.has(ModLoader.FABRIC)) {
          release.loaders.add(ModLoader.FORGE);
          release.loaders.add(ModLoader.NEOFORGE);
          logger.trace(`Injected forge and neoforge into fabric-compatible release: ${release.modMetadata.id} ${release.modVersion}`);
        }
      }
    }
  }

  // Get solutions
  return await solutionFinder.resolveSolutions(
    mods, constraints, nbSolutions);
}

program
  .name('modpack-cli')
  .description('CLI for managing modpacks')
  .version('0.0.1');

program
  .command('find-solutions').alias('fs')
  .description('Find mod versions that match constraints')
  .option('--mod-id <modID...>', 'Mod IDs to include in the modpack')
  .option('--mod-file <path...>', 'Mod IDs to include in the modpack')
  .addOption(new Option('--exact-version <version>', 'Exact Minecraft version to consider').conflicts(['minVersion', 'maxVersion']))
  .option('--min-version <version>', 'Minimum Minecraft version to consider')
  .option('--max-version <version>', 'Maximum Minecraft version to consider')
  .option('--loader <loader...>', 'Loaders to consider (e.g., forge, fabric)', [])
  .option('-d, --details', 'Include details (e.g. unsupported mods in solutions found)', false)
  .option('-n, --nb-solutions <number>', 'Number of solutions to output', (value) => parseInt(value, 10), 3)
  .option('--sinytra', 'Inject forge and neoforge into fabric-compatible releases', false)
  .option('-r, --repository <repo...>', 'Repositories to use (modrinth, curseforge)')
  .action(async (cliOptions: CliOptions & { repository?: string[] }) => {
    let modQueryService = getModQueryService(cliOptions.repository);
    validateCliOptions(cliOptions);

    const requestedMods = await getMods(modQueryService, cliOptions);
    if (requestedMods.length === 0) {
      logger.error('No valid mod IDs found from provided options.');
      return;
    }

    logger.info(`Searching for solutions with ${requestedMods.length} mod(s)...`);
    const solutions = await findSolutions(
      modQueryService,
      requestedMods,
      {
        minVersion: cliOptions.exactVersion || cliOptions.minVersion,
        maxVersion: cliOptions.exactVersion || cliOptions.maxVersion,
        loaders: new Set(cliOptions.loader as ModLoader[]),
      },
      cliOptions.nbSolutions,
      !!cliOptions.sinytra
    );

    if (solutions.length === 0) {
      logger.info('No solutions found.');
      return;
    }

    logger.info(`Found ${solutions.length} solution(s):`);
    for (const solution of solutions) {
      logger.info(`- Version: ${solution.mcConfig.mcVersion}, Loader: ${solution.mcConfig.loader}, Mods: ${solution.mods.length}/${requestedMods.length}`);
      if (cliOptions.details && solution.mods.length != requestedMods.length) {

        // Get unsupported mods
        let unsupportedModsMeta: ModMetadata[] = [];
        for (const requestedMod of requestedMods) {
          let hasIncludedRelease = false;
          for (const release of solution.mods) {
            // check if we have repo-specific metadata of this mod in our solution
            if (requestedMod.includes(release.modMetadata)) {
              hasIncludedRelease = true;
              break;
            }
          }
          if (!hasIncludedRelease) unsupportedModsMeta.push(requestedMod);
        }

        logger.info(`  Unsupported mods (${unsupportedModsMeta.length}):`);
        for (const modMeta of unsupportedModsMeta) {
          logger.info(`  - ${modMeta[0].slug} (${modMeta[0].name})`);
        }

      }
    }
    if (!cliOptions.details) {
      logger.info('Use --details to see unsupported mods in solutions.');
    }
  });

program.parse(process.argv);
