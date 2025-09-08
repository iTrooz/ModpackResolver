<script lang="ts">
	let hoveredRow = $state<string | null>(null);
	import * as m from '$msg';
	import type { ModRepoMetadata, ModMetadata } from 'mclib';

	let {
		search_results = $bindable(),
		add_mod_to_list
	}: {
		search_results: ModMetadata[]; // List of mod metadata, each an aggregation from multiple repositories
		add_mod_to_list: (mod: ModRepoMetadata) => void;
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
		{#each search_results.slice(0, 10) as meta (meta[0].id)}
			{@const firstRepoMeta = meta[0]}
			<tr>
				<td
					class="img"
					onclick={() => {
						add_mod_to_list(firstRepoMeta);
					}}
				>
					<img src={firstRepoMeta.imageURL} alt="{firstRepoMeta.name} pic" />
				</td>
				<td
					onclick={() => {
						add_mod_to_list(firstRepoMeta);
					}}
				>
					{firstRepoMeta.name}
				</td>
				<td
					onclick={() => {
						add_mod_to_list(firstRepoMeta);
					}}
				>
					{humanize_number(firstRepoMeta.downloadCount) +
						' ' +
						m['add_mods.search_results.downloads_count']()}
				</td>
				<td class="link" style="position:relative;">
					<a
						href={firstRepoMeta.homepageURL}
						target="_blank"
						rel="noopener noreferrer"
						onmouseenter={() => {
							hoveredRow = firstRepoMeta.id;
						}}
						onmouseleave={() => {
							hoveredRow = null;
						}}
					>
						{m['add_mods.search_results.open_mod_repo_link']({
							repo_name: firstRepoMeta.repository
						})}
						{meta.length > 1 ? ' and more' : ''}
					</a>
					{#if meta.length > 1 && hoveredRow === firstRepoMeta.id}
						<span class="repo-tooltip">
							Found on: {meta.map((m) => m.repository).join(', ')}
						</span>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.repo-tooltip {
		position: absolute;
		background: var(--grey-dark-2);
		color: var(--text-light);
		padding: 0.3rem 0.7rem;
		border-radius: 0.3rem;
		font-size: 0.85rem;
		z-index: 10;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		margin-top: 0.2rem;
		right: 0;
		white-space: nowrap;
	}
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
