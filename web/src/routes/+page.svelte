<script lang="ts">
	import type { Solution, ModSearchMetadata } from 'mclib';
	import { ModpackCreator, ModLoader } from 'mclib';
	import { ModSearch, ModsList } from '$cmpts';
	import * as m from '$msg';
	import { repositories } from '../config/repositories';

	let search_name_input = $state('');
	let is_loading_search = $state(false);
	let search_results: ModSearchMetadata[] = $state([]);

	let mod_list_added: ModSearchMetadata[] = $state([]);

	function add_mod_to_list(mod: ModSearchMetadata): void {
		if (!mod_list_added.includes(mod)) {
			// add mod to list of mods to use
			mod_list_added.push(mod);
			//empty search results list
			search_results = [];
		}
	}

	function remove_mod_from_list(mod: ModSearchMetadata): void {
		const index_mod = mod_list_added.indexOf(mod);
		if (index_mod > -1) {
			mod_list_added.splice(index_mod, 1);
		}
	}

	let mc_results: Solution | null = $state(null);
	let show_raw_data = $state(false);

	let is_loading_mccreator = $state(false);
	let error: string | null = $state(null);

	async function runModpackCreator() {
		try {
			if (mod_list_added.length < 1) {
				throw new Error(m.error_no_mod_added());
			}
			// Reset state
			mc_results = null;
			error = null;
			is_loading_mccreator = true;

			// Create logic instance
			let mc = new ModpackCreator(repositories);

			// Configure MC version and loader
			mc.setLoaders([ModLoader.FORGE]);

			// Add mods to the modpack
			for (const mod of mod_list_added) {
				mc.addModFromID(mod.id);
			}

			// Let the logic run with the constraints
			let solutions = await mc.work(1);
			mc_results = solutions[0];
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Unknown error';
			}
			console.error(err);
		} finally {
			is_loading_mccreator = false;
		}
	}
</script>

<h1>{m.modpack_creator_name()}</h1>

<ModSearch bind:search_name_input bind:search_results bind:is_loading_search {add_mod_to_list} />

<ModsList bind:mod_list_added {remove_mod_from_list} />

<button onclick={runModpackCreator} disabled={is_loading_mccreator || mod_list_added.length < 1}>
	{#if is_loading_mccreator}
		{m.processing_modpack_creator()}
	{:else}
		{m.run_modpack_creator()}
	{/if}
</button>

<section>
	{#if error}
		<p>{m.error_while_calculating()}: {error}</p>
	{:else if is_loading_mccreator}
		<p>{m.processing_modpack_creator()}</p>
	{:else if mc_results}
		<h2>{m.result()}:</h2>
		<h3 class="font-bold">Best Minecraft Configuration:</h3>
		<p>Version: {mc_results.mcConfig.mcVersion}</p>
		<p>Loader: {mc_results.mcConfig.loader}</p>

		<h3 class="mt-4 font-bold">Compatible Mods:</h3>
		<ul class="ml-6 list-disc">
			{#each mc_results.mods as mod (mod.release)}
				<li>
					<strong>{mod.name}</strong>: {mod.release.modVersion}
					<ul class="list-circle ml-4 text-sm">
						<li>Loaders: {mod.release.loaders.join(', ')}</li>
						<li>MC Versions: {mod.release.mcVersions.join(', ')}</li>
					</ul>
				</li>
			{/each}
		</ul>

		<input type="checkbox" bind:checked={show_raw_data} name="show_raw_data" />
		<label for="show_raw_data">{m.show_raw_data()}</label>

		{#if show_raw_data}
			<pre>{JSON.stringify(mc_results, null, 2)}</pre>
		{/if}
	{/if}
</section>
