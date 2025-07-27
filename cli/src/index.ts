#!/usr/bin/env bun

import { program } from '@commander-js/extra-typings';
import { CurseForgeRepository, LocalSolutionFinder, LoggerConfig, ModLoader, ModQueryService, ModrinthRepository, LogLevel, Constraints } from 'mclib';
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

async function timedFetch(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
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
    new ModrinthRepository(timedFetch),
    new CurseForgeRepository(timedFetch),
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
}

function validate(options: CliOptions) {
  if ((!options.modId || options.modId.length === 0) && (!options.modFile || options.modFile.length === 0)) {
    throw new Error('At least one --mod-id or --mod-file is required.');
  }
}

async function getModIds(modQueryService: ModQueryService, options: CliOptions): Promise<string[]> {
  let modIds = [...(options.modId ?? [])];

  if (options.modFile) {
    for (const file of options.modFile) {
      try {

        const start = Date.now();
        const modData = readFileSync(file);
        const duration = Date.now() - start;
        logger.debug(`readFileSync(${file}): ${duration}ms`);

        const modMetadata = await modQueryService.getModByDataHash(new Uint8Array(modData));

        if (modMetadata) {
          modIds.push(modMetadata.id);
          logger.info(`Found mod ID ${modMetadata.id} from file: ${file}`);
        } else {
          logger.warn(`Could not extract mod ID from file: ${file}`);
        }
      } catch (error) {
        logger.error(`Error reading file ${file}: ${error}`);
      }
    }
  }

  return modIds;
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
  .action(async (cliOptions: CliOptions) => {

    let modQueryService = getModQueryService();
    validate(cliOptions);

    const requestedModIds = await getModIds(modQueryService, cliOptions);

    if (requestedModIds.length === 0) {
      logger.error('No valid mod IDs found from provided options.');
      return;
    }

    logger.info(`Searching for solutions with ${requestedModIds.length} mod(s)...`);
    let solutionFinder = new LocalSolutionFinder(modQueryService);
    let solutions = await solutionFinder.findSolutions(requestedModIds, {
      minVersion: cliOptions.minVersion,
      maxVersion: cliOptions.maxVersion,
      loaders: cliOptions.loader as ModLoader[] | undefined,
    }, cliOptions.nbSolutions);

    if (solutions.length === 0) {
      logger.info('No solutions found.');
      return;
    }

    logger.info(`Found ${solutions.length} solution(s):`);
    for (const solution of solutions) {
      logger.info(`- Version: ${solution.mcConfig.mcVersion}, Loader: ${solution.mcConfig.loader}, Mods: ${solution.mods.length}/${requestedModIds.length}`);
      if (cliOptions.details && solution.mods.length != requestedModIds.length) {
        logger.info(`  Unsupported mods:`);
        let unsupportedMods = requestedModIds.filter(modId => !solution.mods.some(mod => mod.id === modId));
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
