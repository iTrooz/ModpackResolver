<script lang="ts">
	import * as m from '$msg';
	import type { ModSearchMetadata } from 'mclib';
	import { slide } from 'svelte/transition';

	let {
		mod_list_added = $bindable(),
		remove_mod_from_list
	}: {
		mod_list_added: ModSearchMetadata[];
		remove_mod_from_list: (mod: ModSearchMetadata) => void;
	} = $props();
</script>

{#if mod_list_added.length > 0}
	<ul id="mods_list" transition:slide={{ axis: 'y', duration: 200 }}>
		{#each mod_list_added as mod (mod.id)}
			<li transition:slide={{ axis: 'y', duration: 200 }}>
				<div class="infos">
					<img src={mod.imageURL} alt={mod.name + ' picture'} />
					<p>{mod.name}</p>
				</div>
				<div class="actions">
					<button
						class="remove_mod"
						onclick={() => {
							remove_mod_from_list(mod);
						}}>󰍴 {m['add_mods.search_results.remove_mod']()}</button
					>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	#mods_list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		border: solid 2px var(--green);
		background: var(--grey-dark-1);
		& li {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			gap: 1rem;
			align-items: center;
			background: var(--grey-dark-2);
			padding: 0.5rem;
			& .infos {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.5rem;
				& img {
					width: 32px;
					height: 32px;
				}
			}
			& .actions {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.5rem;
				& .remove_mod {
					background: var(--red);
					padding: 0.2rem 0.3rem;
					outline: none;
					border: solid 2px transparent;
					&:is(:focus, :focus-visible, :active, :hover) {
						border-color: var(--red-light-1);
					}
				}
			}
		}
	}
</style>
