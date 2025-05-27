<script lang="ts">
	import * as m from '$msg';
	import type { ModRepository, ModSearchMetadata } from 'mclib';

	let {
		search_results = $bindable(),
		add_mod_to_list
	}: {
		search_results: [ModRepository, ModSearchMetadata][];
		add_mod_to_list: (mod_name: ModSearchMetadata) => void;
	} = $props();
</script>

<ul id="mod_search_list">
	{#each search_results.slice(0, 10) as [repository, mod] (mod.name)}
		<li>
			<button
				class="result_line"
				onclick={() => {
					add_mod_to_list(mod);
				}}
			>
				<div class="name">
					<img src={mod.imageURL} alt="{mod.name} pic" />
					<p>{mod.name}</p>
				</div>
				<sub>{mod.downloadCount + ' ' + m.downloads_count()}</sub>
				<sub>{repository}</sub>
			</button>
		</li>
	{/each}
</ul>

<style>
	#mod_search_list {
		background: var(--grey-dark-1);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		& li::marker {
			content: none;
		}
		& .result_line {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			padding: 0.5rem;
			background: var(--grey-dark-2);
			border: none;
			outline: solid 2px transparent;
			cursor: pointer;
			color: var(--grey-light-2);
			width: 100%;
			&:is(:focus, :focus-visible, :active, :hover) {
				outline-color: var(--grey);
			}
			& .name {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.5rem;
				& img {
					width: 32px;
					height: 32px;
				}
			}
		}
	}
</style>
