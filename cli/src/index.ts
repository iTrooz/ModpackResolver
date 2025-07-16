#!/usr/bin/env bun

import { program } from '@commander-js/extra-typings';
import { CurseForgeRepository, LocalSolutionFinder, LoggerConfig, ModLoader, ModQueryService, ModrinthRepository, LogLevel, Constraints } from 'mclib';

LoggerConfig.setLevel((process.env.LOG_LEVEL ?? "info") as LogLevel);

function getModQueryService() {
  const repositories = [
    new ModrinthRepository(fetch),
    new CurseForgeRepository(fetch),
  ];
  return new ModQueryService(repositories);
}

interface Options {
  modId?: string[];
  minVersion?: string;
  maxVersion?: string;
  loader?: string[];
}

function validate(modQueryService: ModQueryService, options: Options) {
  if (!options.modId || options.modId.length === 0) {
    throw new Error('At least one --mod-id is required.');
  }
}

program
  .name('modpack-cli')
  .description('CLI for managing modpacks')
  .version('0.0.1');

program
  .command('find-solutions').alias('fs')
  .description('Find mod versions that match constraints')
  .option('--mod-id <modID...>', 'Mod IDs to include in the modpack')
  .option('--min-version <version>', 'Minimum Minecraft version to consider')
  .option('--max-version <version>', 'Maximum Minecraft version to consider')
  .option('--loader <loader...>', 'Loaders to consider (e.g., forge, fabric)', [])
  .action(async (cliOptions: Options) => {

    let modQueryService = getModQueryService();
    validate(modQueryService, cliOptions);

    console.log(`Searching for solutions..`);
    let solutionFinder = new LocalSolutionFinder(modQueryService);
    let solutions = await solutionFinder.findSolutions(cliOptions.modId!, {
      minVersion: cliOptions.minVersion,
      maxVersion: cliOptions.maxVersion,
      loaders: cliOptions.loader as ModLoader[] | undefined,
    });

    if (solutions.length === 0) {
      console.log('No solutions found.');
      return;
    }

    console.log(`Found ${solutions.length} solution(s):`);
    for (const solution of solutions) {
      console.log(`- Version: ${solution.mcConfig.mcVersion}, Loader: ${solution.mcConfig.loader}, Mods: ${solution.mods.length}/${cliOptions.modId?.length}`);
    }
  });

program.parse(process.argv);
