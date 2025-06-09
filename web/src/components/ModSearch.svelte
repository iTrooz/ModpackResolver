<script lang="ts">
	import * as m from '$msg';
	import { ModSearchService, ModRepositoryName } from 'mclib';
	import type { ModSearchMetadata } from 'mclib';
	import { ModSearchList, ToggleButtons } from '$cmpts';
	import { slide } from 'svelte/transition';
	import { repositories } from '../config';

	let {
		search_name_input = $bindable(),
		search_results = $bindable(),
		is_loading_search = $bindable(),
		add_mod_to_list
	}: {
		search_name_input: string;
		search_results: [ModRepositoryName, ModSearchMetadata][];
		is_loading_search: boolean;
		add_mod_to_list: (mod: ModSearchMetadata) => void;
	} = $props();

	let selected_mod_repo_names: ModRepositoryName[] = $state([]);
	let selected_repositories = $derived(
		repositories.filter((repo) => {
			// select all repos for search if nothing is selected
			if (selected_mod_repo_names.length < 1) return true;
			// or check if the repo_name is selected
			return selected_mod_repo_names.includes(repo.getRepositoryName());
		})
	);

	let timeout: ReturnType<typeof setTimeout>; // because I fucking can't use NodeJS.Timeout
	let automatic_searching: boolean = $state(false);

	function handle_automatic_search_input() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(search_for_mods, 500);
		automatic_searching = true;
		if (search_name_input.length == 0) search_results = [];
	}

	async function search_for_mods() {
		if (search_name_input.length == 0) return;
		try {
			// set loading mode
			is_loading_search = true;
			let mod_search_service = new ModSearchService();
			const results = await mod_search_service.searchMods(search_name_input, selected_repositories);
			search_results = results;
		} catch (err) {
			console.log(err);
		} finally {
			is_loading_search = false;
			automatic_searching = false;
		}
	}
</script>

<section>
	<form
		class="search"
		onsubmit={(e: Event) => {
			e.preventDefault();
		}}
	>
		<ToggleButtons
			bind:selection={selected_mod_repo_names}
			entries_list={repositories.map((repo) => {
				return repo.getRepositoryName();
			})}
			name="mod-repo-names-selection"
			onchange={search_for_mods}
			reset
		/>
		<div class="text">
			<input
				type="text"
				placeholder={m.search_mod_by_name()}
				bind:value={search_name_input}
				oninput={handle_automatic_search_input}
			/>
			<input
				type="submit"
				value={m.search_for_mods()}
				onclick={search_for_mods}
				disabled={automatic_searching}
			/>
		</div>
	</form>

	{#if search_results.length > 0 && search_name_input.length > 0}
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
		width: -moz-available;
		width: -webkit-fill-available;
	}
	form.search {
		display: flex;
		flex-flow: column;
		gap: 0.5rem;
		& .text {
			display: flex;
			flex-direction: row;
			gap: 0.5rem;
			flex-wrap: wrap;
			justify-content: center;
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
	}
</style>
