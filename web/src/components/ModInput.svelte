<script lang="ts">
	import * as m from '$msg';
	import { ModrinthRepository } from 'mclib';
	import type { ModSearchMetadata } from 'mclib';

	let {
		search_name_input = $bindable(''),
		search_results = $bindable([]),
		is_loading_search = $bindable(false)
	}: {
		search_name_input: string;
		search_results: ModSearchMetadata[];
		is_loading_search: boolean;
	} = $props();

	async function search_for_mods() {
		try {
			// reset results
			search_results = [];
			// set loading mode
			is_loading_search = true;
			let modrinth_repo = new ModrinthRepository();
			search_results = await modrinth_repo.searchMods(search_name_input);
		} catch (err) {
			console.log(err);
		} finally {
			is_loading_search = false;
		}
	}
</script>

<form
	class="mod_input"
	onsubmit={(e: Event) => {
		e.preventDefault();
	}}
>
	<input type="text" placeholder={m.search_mod_by_name()} bind:value={search_name_input} />
	<input type="submit" value={m.search_for_mods()} onclick={search_for_mods} />
</form>

<button onclick={() => {}}>󰐕{m.add_mod()}</button>

<style>
	.mod_input {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
	}
</style>
