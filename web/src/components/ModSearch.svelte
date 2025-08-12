<script lang="ts">
	import * as m from '$msg';
	import { ModRepositoryName } from 'mclib';
	import type { ModRepoMetadata } from 'mclib';
	import { ModSearchList, ToggleButtons } from '$cmpts';
	import { slide } from 'svelte/transition';
	import { modQueryService, repositories } from '../config';

	let {
		search_name_input = $bindable(),
		search_results = $bindable(),
		is_loading_search = $bindable(),
		add_mod_to_list
	}: {
		search_name_input: string;
		search_results: [ModRepositoryName, ModRepoMetadata][];
		is_loading_search: boolean;
		add_mod_to_list: (mod: ModRepoMetadata) => void;
	} = $props();

	let selected_mod_repo_names: ModRepositoryName[] = $state([]);

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
			const results = await modQueryService.searchMods(search_name_input, selected_mod_repo_names);
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
		<form
			id="search"
			onsubmit={(e: Event) => {
				e.preventDefault();
			}}
			onreset={() => {
				(document.querySelector('form#search input[type=search]') as HTMLInputElement).focus();
			}}
		>
			<input
				type="search"
				placeholder={m['add_mods.search_mod_by_name']()}
				bind:value={search_name_input}
				oninput={handle_automatic_search_input}
			/>
			{#if search_name_input.length > 0}
				<input transition:slide={{ axis: 'x', duration: 200 }} type="reset" value="X" />
			{/if}
		</form>
		<input
			type="submit"
			value={m['add_mods.search_mods_button']()}
			onclick={search_for_mods}
			disabled={automatic_searching}
		/>
	</div>

	{#if search_results.length > 0 && search_name_input.length > 0}
		<div transition:slide={{ axis: 'y', duration: 200 }}>
			<ModSearchList bind:search_results {add_mod_to_list} />
		</div>
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-flow: column;
		gap: 0.5rem;
		& .text {
			display: flex;
			flex-direction: row;
			gap: 0.5rem;
			flex-wrap: wrap;
			#search {
				flex: 7;
				display: flex;
				flex-direction: row;
				background: var(--grey-dark-1);
				border: solid 2px var(--green);
				outline: none;
				&:is(:focus, :focus-visible, :active, :hover) {
					border-color: var(--green-light-1);
				}
				& input[type='search'] {
					width: 100%;
					padding: 0.4rem;
					color: var(--grey-light-2);
					background: none;
					border: none;
					outline: none;
				}
				& input[type='reset'] {
					border: none;
					outline: none;
					padding: 0rem 0.4rem;
					background: none;
					color: var(--grey);
					&:is(:focus, :focus-visible, :active, :hover) {
						color: var(--grey-light-1);
					}
				}
			}
			& input[type='submit'] {
				flex: 1;
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
