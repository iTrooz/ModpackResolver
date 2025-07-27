#!/usr/bin/env bun

import { program } from '@commander-js/extra-typings';
import { CurseForgeRepository, LocalSolutionFinder, LoggerConfig, ModLoader, ModQueryService, ModrinthRepository, LogLevel, Constraints, Solution } from 'mclib';
import { readFileSync } from 'fs';
import pino from 'pino';

// Logging setup
const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info") as LogLevel;
const logger = pino({
  level: LOG_LEVEL,
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

function getModQueryService() {
  const repositories = [
    new ModrinthRepository(fetchWrapper),
    new CurseForgeRepository(fetchWrapper),
  ];
  return new ModQueryService(repositories);
}

interface CliOptions {
  modId?: string[];
  modFile?: string[];
  minVersion?: string;
  maxVersion?: string;
  loader?: string[];
  details?: boolean;
  nbSolutions: number;
  sinytra?: boolean;
}

function validateCliOptions(options: CliOptions) {
  if ((!options.modId || options.modId.length === 0) && (!options.modFile || options.modFile.length === 0)) {
    throw new Error('At least one --mod-id or --mod-file is required.');
  }
}

async function getModIds(modQueryService: ModQueryService, options: CliOptions): Promise<string[]> {
  const modIdSet = new Set<string>();

  if (options.modId) {
    for (const id of options.modId) {
      if (modIdSet.has(id)) {
        logger.warn(`Duplicate mod ID from --mod-id: ${id}`);
      } else {
        modIdSet.add(id);
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
        let modMetadata = await modQueryService.getModByDataHash(new Uint8Array(modData));
        if (!modMetadata) {
          logger.warn(`Could not extract mod ID from file: ${file}`);
          continue;
        }

        // add to set
        if (modIdSet.has(modMetadata.id)) {
          logger.warn(`Duplicate mod ID from file: ${modMetadata.id} (file: ${file})`);
        } else {
          modIdSet.add(modMetadata.id);
          logger.info(`Found mod ID ${modMetadata.id} from file: ${file}`);
        }
      } catch (error) {
        logger.error(`Error processing mod file ${file}: ${error}`);
        continue;
      }
    }
  }

  return Array.from(modIdSet);
}

async function findSolutions(
  modQueryService: ModQueryService,
  requestedModIds: string[],
  constraints: Constraints,
  nbSolutions: number,
  sinytra: boolean
): Promise<Solution[]> {
  let solutionFinder = new LocalSolutionFinder(modQueryService);

  // Resolve mods
  const mods = await solutionFinder.resolveMods(requestedModIds);

  // Sinytra loader injection
  if (sinytra) {
    logger.info('Sinytra mode: Injecting Forge and NeoForge into Fabric-compatible releases...');
    for (const mod of mods) {
      for (const release of mod.releases) {
        if (release.loaders.has(ModLoader.FABRIC)) {
          release.loaders.add(ModLoader.FORGE);
          release.loaders.add(ModLoader.NEOFORGE);
          logger.trace(`Injected forge and neoforge into fabric-compatible release: ${mod.id} ${release.modVersion}`);
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
  .option('--min-version <version>', 'Minimum Minecraft version to consider')
  .option('--max-version <version>', 'Maximum Minecraft version to consider')
  .option('--loader <loader...>', 'Loaders to consider (e.g., forge, fabric)', [])
  .option('-d, --details', 'Include details (e.g. unsupported mods in solutions found)')
  .option('-n, --nb-solutions <number>', 'Number of solutions to output', (value) => parseInt(value, 10), 3)
  .option('--sinytra', 'Inject forge and neoforge into fabric-compatible releases')
  .action(async (cliOptions: CliOptions & { sinytra?: boolean }) => {
    let modQueryService = getModQueryService();
    validateCliOptions(cliOptions);

    const requestedModIds = await getModIds(modQueryService, cliOptions);
    if (requestedModIds.length === 0) {
      logger.error('No valid mod IDs found from provided options.');
      return;
    }

    logger.info(`Searching for solutions with ${requestedModIds.length} mod(s)...`);
    const solutions = await findSolutions(
      modQueryService,
      requestedModIds,
      {
        minVersion: cliOptions.minVersion,
        maxVersion: cliOptions.maxVersion,
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
      logger.info(`- Version: ${solution.mcConfig.mcVersion}, Loader: ${solution.mcConfig.loader}, Mods: ${solution.mods.length}/${requestedModIds.length}`);
      if (cliOptions.details && solution.mods.length != requestedModIds.length) {
        let unsupportedMods = requestedModIds.filter(modId => !solution.mods.some(mod => mod.id === modId));
        logger.info(`  Unsupported mods (${unsupportedMods.length}):`);
        for (const modId of unsupportedMods) {
          logger.info(`  - ${modId}`);
        }
      }
    }
    if (!cliOptions.details) {
      logger.info('Use --details to see unsupported mods in solutions.');
    }
  });

program.parse(process.argv);
