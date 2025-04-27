<script lang="ts">
	import { ModpackCreator, ModRepository, ModSourceType, ModLoader } from '$lib';
	import { onMount } from 'svelte';

	let results: {
		mcConfig: { mcVersion: string; loader: ModLoader };
		mods: Array<{ name: string; release: any }>;
	} | null = null;

	let isLoading = false;
	let error: string | null = null;

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

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">ModpackCreator Example</h1>

	<div class="mb-4">
		<button
			class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 {isLoading
				? 'cursor-not-allowed opacity-50'
				: ''}"
			on:click={runModpackCreator}
			disabled={isLoading}
		>
			{#if isLoading}
				Processing...
			{:else}
				Run ModpackCreator
			{/if}
		</button>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700" role="alert">
			<strong class="font-bold">Error:</strong>
			<span class="block sm:inline">{error}</span>
		</div>
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
		</div>
	{/if}

	{#if results}
		<div class="mt-8">
			<h2 class="mb-2 text-xl font-bold">Results:</h2>
			<div class="overflow-auto rounded-md bg-gray-100 p-4">
				<h3 class="font-bold">Best Minecraft Configuration:</h3>
				<p>Version: {results.mcConfig.mcVersion}</p>
				<p>Loader: {results.mcConfig.loader}</p>

				<h3 class="mt-4 font-bold">Compatible Mods:</h3>
				<ul class="ml-6 list-disc">
					{#each results.mods as mod}
						<li>
							<strong>{mod.name}</strong>: {mod.release.modVersion}
							<ul class="list-circle ml-4 text-sm">
								<li>Loaders: {mod.release.loaders.join(', ')}</li>
								<li>MC Versions: {mod.release.mcVersions.join(', ')}</li>
							</ul>
						</li>
					{/each}
				</ul>
			</div>

			<h3 class="mt-4 font-bold">Raw Data:</h3>
			<pre class="overflow-auto rounded-md bg-gray-100 p-4 text-xs">
        {JSON.stringify(results, null, 2)}
      </pre>
		</div>
	{/if}
</div>
