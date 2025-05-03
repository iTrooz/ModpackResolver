<script lang="ts">
	import type { Solution } from 'mclib';
	import { ModpackCreator, ModLoader } from 'mclib';
	import * as m from '$msg';

	let search_name = $state('');
	let results: Solution | null = $state(null);
	let show_raw_data = $state(false);

	let isLoading = $state(false);
	let error: string | null = $state(null);

	async function runModpackCreator() {
		try {
			// Reset state
			results = null;
			error = null;
			isLoading = true;

			// Create logic instance
			let mc = new ModpackCreator();

			// Configure MC version and loader
			mc.setLoaders([ModLoader.FORGE]);

			// Add mods to the modpack
			mc.addModFromID('ice-and-fire-dragons');

			// Let the logic run with the constraints
			let solutions = await mc.work(1);
			results = solutions[0];
		} catch (err: any) {
			error = err.message || 'Unknown error';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}
</script>

<h1>Modpack Creator</h1>

<div>
	<input type="text" placeholder={m.search_mod_by_name()} bind:value={search_name} />
	<button onclick={() => {}}>󰐕{m.add()}</button>
</div>

<button onclick={runModpackCreator} disabled={isLoading}>
	{#if isLoading}
		{m.processing_modpack_creator()}
	{:else}
		{m.run_modpack_creator()}
	{/if}
</button>

<section>
	{#if error}
		<p>{m.error()}: {error}</p>
	{:else if isLoading}
		<p>{m.processing_modpack_creator()}</p>
	{:else if results}
		<h2>{m.result()}:</h2>
		<h3 class="font-bold">Best Minecraft Configuration:</h3>
		<p>Version: {results.mcConfig.mcVersion}</p>
		<p>Loader: {results.mcConfig.loader}</p>

		<h3 class="mt-4 font-bold">Compatible Mods:</h3>
		<ul class="ml-6 list-disc">
			{#each results.mods as mod (mod.release)}
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
			<pre>{JSON.stringify(results, null, 2)}</pre>
		{/if}
	{/if}
</section>
