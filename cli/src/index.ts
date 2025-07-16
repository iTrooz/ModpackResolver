#!/usr/bin/env bun

import { program } from '@commander-js/extra-typings';
import { CurseForgeRepository, LocalSolutionFinder, LoggerConfig, ModLoader, ModQueryService, ModrinthRepository, LogLevel, Constraints } from 'mclib';
import { readFileSync } from 'fs';

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
  modFile?: string[];
  minVersion?: string;
  maxVersion?: string;
  loader?: string[];
}

function validate(options: Options) {
  if ((!options.modId || options.modId.length === 0) && (!options.modFile || options.modFile.length === 0)) {
    throw new Error('At least one --mod-id or --mod-file is required.');
  }
}

async function getModIds(modQueryService: ModQueryService, options: Options): Promise<string[]> {
  let modIds = [...(options.modId ?? [])];
  
  if (options.modFile) {
    for (const file of options.modFile) {
      try {
        console.log(`Reading mod file: ${file}`);
        const modData = readFileSync(file);
        const modMetadata = await modQueryService.getModByDataHash(new Uint8Array(modData));
        
        if (modMetadata) {
          modIds.push(modMetadata.id);
          console.log(`Found mod ID ${modMetadata.id} from file: ${file}`);
        } else {
          console.warn(`Could not extract mod ID from file: ${file}`);
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
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
  .action(async (cliOptions: Options) => {

    let modQueryService = getModQueryService();
    validate(cliOptions);
    
    const modIds = await getModIds(modQueryService, cliOptions);
    
    if (modIds.length === 0) {
      console.error('No valid mod IDs found from provided options.');
      return;
    }

    console.log(`Searching for solutions with ${modIds.length} mod(s)...`);
    let solutionFinder = new LocalSolutionFinder(modQueryService);
    let solutions = await solutionFinder.findSolutions(modIds, {
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
      console.log(`- Version: ${solution.mcConfig.mcVersion}, Loader: ${solution.mcConfig.loader}, Mods: ${solution.mods.length}/${modIds.length}`);
    }
  });

program.parse(process.argv);
