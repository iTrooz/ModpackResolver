<script lang="ts">
	import type { Solution } from 'mclib';
	import { ModResultsList } from '$cmpts';
	import { m } from '$msg';
	import ReleaseResultCarousel from './ReleaseResultCarousel.svelte';

	let { results }: { results: Solution[] } = $props();
	let remaining_results: Solution[] = $derived(results.slice(1));
</script>

<h2>{m['runner.results.best_config']()}:</h2>
<p>
	{m['runner.results.mc_version']({ count: results[0].mcConfig.mcVersion.length })}:
	<b>{results[0].mcConfig.mcVersion}</b>
</p>
<p>
	{m['runner.results.loader']({ count: results[0].mcConfig.loader.length })}:
	<b>{results[0].mcConfig.loader}</b>
</p>

<h3>{m['runner.results.compatible_mods']()}:</h3>
<ModResultsList mod_list={results[0].mods} />
{#if remaining_results.length > 0}
	<ReleaseResultCarousel results={remaining_results} />
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
</style>
