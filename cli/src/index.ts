#!/usr/bin/env bun

import { Command } from 'commander';
import { ModpackCreator } from 'lib/lib/ModpackCreator';

const program = new Command();

program
  .name('modpack-cli')
  .description('CLI for managing modpacks')
  .version('0.0.1');

program
  .command('create')
  .description('Create a new modpack')
  .option('--mod-name <modName...>', 'Mod IDs to include in the modpack')
  .option('--min-version <version>', 'Minimum version of the modpack')
  .option('--loader <loader...>', 'Loaders to support (e.g., forge, fabric)')
  .action(async (options) => {
    const { modName, minVersion, loader } = options;

    if (!modName || modName.length === 0) {
      console.error('Error: At least one --mod-name is required.');
      process.exit(1);
    }

    if (!minVersion) {
      console.error('Error: --min-version is required.');
      process.exit(1);
    }

    if (!loader || loader.length === 0) {
      console.error('Error: At least one --loader is required.');
      process.exit(1);
    }

    const creator = new ModpackCreator()
      .chooseMinimalVersion(minVersion)
      .setLoaders(loader);

    modName.forEach((id) => creator.addModFromID(id));

    try {
      const solutions = await creator.work(1); // Get the best solution
      if (solutions.length > 0) {
        console.log('Modpack created successfully with the following solution:');
        console.log(JSON.stringify(solutions[0], null, 2));
      } else {
        console.error('No compatible solutions found for the given constraints.');
      }
    } catch (error) {
      console.error('An error occurred while creating the modpack:', error.message);
    }
  });

program
  .command('list')
  .description('List all modpacks')
  .action(() => {
    const creator = new ModpackCreator();
    const modpacks = creator.list();
    console.log('Available modpacks:', modpacks);
  });

program.parse(process.argv);
