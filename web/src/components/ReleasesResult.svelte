<script lang="ts">
	import type { ModRepoMetadata, Solution } from 'mclib';
	import { ModResultsList } from '$cmpts';
	import { m } from '$msg';
	import ReleaseResultCarousel from './ReleaseResultCarousel.svelte';

	let { results, selected_mods }: { results: Solution[]; selected_mods: ModRepoMetadata[] } =
		$props();
	let remaining_results: Solution[] = $derived(results.slice(1));
</script>

<h2>{m['runner.results.best_config']()}:</h2>
<div class="infos">
	<div class="config">
		<p>
			{m['runner.results.mc_version']({ count: 1 })}:
			<b>{results[0].mcConfig.mcVersion}</b>
		</p>
		<p>
			{m['runner.results.loader']({ count: 1 })}:
			<b>{results[0].mcConfig.loader}</b>
		</p>
	</div>
	<p>
		<b>{results[0].mods.length}</b>/{selected_mods.length}
		{m['runner.results.mod']({ count: selected_mods.length })}
	</p>
</div>

<ModResultsList mod_list={results[0].mods} />
{#if remaining_results.length > 0}
	<ReleaseResultCarousel results={remaining_results} {selected_mods} />
{/if}

<button
	id="log_raw_data"
	onclick={() => {
		console.log(JSON.stringify(results, null, 2));
	}}>&lt;/&gt; {m['runner.log_raw_data']()}</button
>

<style>
	button#log_raw_data {
		outline: none;
		border: solid 2px var(--green);
		background: none;
		color: var(--grey-light-2);
	}
	.infos {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: end;
		& .config {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
