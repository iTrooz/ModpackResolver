<script lang="ts">
	import * as m from '$msg';
	import { ModrinthRepository } from 'mclib';
	import type { ModSearchMetadata } from 'mclib';
	import { ModSearchList } from '$cmpts';
	import { slide } from 'svelte/transition';

	let {
		search_name_input = $bindable(),
		search_results = $bindable(),
		is_loading_search = $bindable(),
		add_mod_to_list
	}: {
		search_name_input: string;
		search_results: ModSearchMetadata[];
		is_loading_search: boolean;
		add_mod_to_list: (mod_name: ModSearchMetadata) => void;
	} = $props();

	async function search_for_mods() {
		try {
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

<section>
	<form
		class="mod_input"
		onsubmit={(e: Event) => {
			e.preventDefault();
		}}
	>
		<input type="text" placeholder={m.search_mod_by_name()} bind:value={search_name_input} />
		<input type="submit" value={m.search_for_mods()} onclick={search_for_mods} />
	</form>

	{#if search_results.length > 0}
		<div transition:slide={{ axis: 'y', duration: 200 }}>
			<ModSearchList bind:search_results {add_mod_to_list} />
		</div>
	{/if}
</section>

<style>
	section {
		width: 42rem;
		max-width: 42rem;
		display: flex;
		flex-direction: column;
		justify-content: stretch;
	}
	.mod_input {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		/* align-items: stretch; */
		& input[type='text'] {
			flex: 1;
			background: var(--grey-dark-1);
			border: solid 2px var(--green);
			outline: none;
			color: var(--grey-light-2);
			padding: 0.4rem;
			&:is(:focus, :focus-visible, :active, :hover) {
				border-color: var(--green-light-1);
			}
		}
		& input[type='submit'] {
			background: var(--green);
			border: none;
			border: solid 2px var(--green);
			outline: none;
			padding: 0rem 0.4rem;
			&:is(:focus, :focus-visible, :active, :hover) {
				border-color: var(--green-light-1);
			}
		}
	}
</style>
