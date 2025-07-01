<script lang="ts">
	import * as m from '$msg';
	import type { ModRepositoryName, ModSearchMetadata } from 'mclib';

	let {
		search_results = $bindable(),
		add_mod_to_list
	}: {
		search_results: [ModRepositoryName, ModSearchMetadata][]; // list of (repository, mod search metadata)
		add_mod_to_list: (mod: ModSearchMetadata) => void;
	} = $props();

	function humanize_number(input: number): string {
		const scales = [
			{ factor: 1e9, suffix: 'B' },
			{ factor: 1e6, suffix: 'M' },
			{ factor: 1e3, suffix: 'k' }
		];

		for (const scale of scales) {
			if (input >= scale.factor) {
				const value = input / scale.factor;
				return `${Math.floor(value)}${scale.suffix}`;
			}
		}

		// If no scale applies, just return the number as a string
		return input.toString();
	}
</script>

<table id="mod_search_list">
	<!-- <thead>
		<tr>
			<th>Icon</th>
			<th>Name</th>
			<th>Downloads</th>
			<th>Link</th>
		</tr>
	</thead> -->
	<tbody>
		{#each search_results.slice(0, 10) as [repository, mod] (mod.id)}
			<tr>
				<td
					class="img"
					onclick={() => {
						add_mod_to_list(mod);
					}}
				>
					<img src={mod.imageURL} alt="{mod.name} pic" />
				</td>
				<td
					onclick={() => {
						add_mod_to_list(mod);
					}}
				>
					{mod.name}
				</td>
				<td
					onclick={() => {
						add_mod_to_list(mod);
					}}
				>
					{humanize_number(mod.downloadCount) +
						' ' +
						m['add_mods.search_results.downloads_count']()}
				</td>
				<td class="link">
					<a href={mod.homepageURL} target="_blank" rel="noopener noreferrer">
						{m['add_mods.search_results.open_mod_repo_link']({ repo_name: repository })}
					</a>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table#mod_search_list {
		border-spacing: 0 0.5rem;
		padding: 0 0.5rem;
		background: var(--grey-dark-1);
		font-size: 0.9rem;
		width: 100%;
		& tbody tr {
			&:is(:focus, :focus-visible, :active, :hover) td {
				background: var(--grey);
			}
			& td {
				&.img {
					padding: 0.4rem;
					padding-bottom: 0.1rem;
					width: 32px;
					height: 32px;
					& img {
						width: 32px;
						height: 32px;
					}
				}
				&.link {
					text-align: end;
				}
				cursor: pointer;
				padding: 0.4rem;
				background: var(--grey-dark-2);
			}
		}
	}
</style>
