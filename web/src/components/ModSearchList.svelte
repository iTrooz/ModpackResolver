<script lang="ts">
	let hoveredRow = $state<string | null>(null);
	import * as m from '$msg';
	import type { ModRepoMetadata, ModMetadata } from 'mclib';
	import { slide } from 'svelte/transition';

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

	$effect(() => {
		const scrollableList = document.querySelectorAll('div.scrollable');
		if (scrollableList) {
			for (const scrollableDiv of scrollableList.values()) {
				if (scrollableDiv.id == hoveredRow)
					scrollableDiv.querySelector('.links')?.scrollIntoView({ block: 'nearest' });
				else scrollableDiv.querySelector('.displayed')?.scrollIntoView({ block: 'nearest' });
			}
		}
	});
</script>

<ul id="mod_search_list">
	{#each search_results.slice(0, 10) as modMeta (modMeta[0].id)}
		{@const firstRepoMeta = modMeta[0]}
		<li class="scroller">
			<div
				role="button"
				tabindex="0"
				class="scrollable"
				id={firstRepoMeta.id}
				onmouseleave={() => {
					hoveredRow = null;
				}}
			>
				<div class="displayed">
					<div
						class="infos"
						role="button"
						tabindex={0}
						onclick={() => {
							add_mod_to_list(firstRepoMeta);
						}}
						onkeydown={(ke) => {
							if (ke.code == 'Enter') add_mod_to_list(firstRepoMeta);
						}}
					>
						<div class="name">
							<img src={firstRepoMeta.imageURL} alt="{firstRepoMeta.name} pic" />
							<p>
								{firstRepoMeta.name}
							</p>
						</div>
						<p>
							{humanize_number(modMeta.reduce((sum, current) => sum + current.downloadCount, 0)) +
								' ' +
								m['add_mods.search_results.downloads_count']()}
						</p>
					</div>
					<div
						role="button"
						tabindex={0}
						class="see-links {hoveredRow == firstRepoMeta.id ? 'hide' : ''}"
						onmouseenter={() => {
							hoveredRow = firstRepoMeta.id;
						}}
						onmouseleave={() => {
							hoveredRow = null;
						}}
					>
						<p>{m['add_mods.search_results.repo_from']()} »</p>
					</div>
				</div>
				<div
					class="links"
					role="list"
					onmouseenter={() => {
						hoveredRow = firstRepoMeta.id;
					}}
					onmouseleave={() => {
						hoveredRow = null;
					}}
				>
					{#each modMeta as repo (repo.id)}
						<a href={repo.homepageURL} target="_blank" rel="noopener noreferrer"
							>{repo.repository.toUpperCase()}</a
						>
					{/each}
				</div>
			</div>
		</li>
	{/each}
</ul>

<style>
	ul#mod_search_list {
		padding: 0.5rem 0.5rem;
		background: var(--grey-dark-1);
		font-size: 0.9rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		& li.scroller {
			width: 100%;
			overflow-x: hidden;
			scroll-snap-type: x mandatory;
			scroll-behavior: smooth;
			& .scrollable {
				display: flex;
				flex-direction: row;
				align-items: stretch;
				width: 200%;
				& .displayed {
					display: flex;
					flex-direction: row;
					align-items: stretch;
					width: 50%;
					& div.infos {
						padding: 0.4rem;
						flex: 1;
						display: flex;
						flex-direction: row;
						justify-content: space-between;
						gap: 0.5rem;
						align-items: center;
						cursor: pointer;
						z-index: 1;
						background: var(--grey-dark-2);
						& div.name {
							display: flex;
							flex-direction: row;
							align-items: center;
							gap: 0.5rem;
						}
						&:hover {
							background: var(--grey);
						}
						& img {
							width: 32px;
							height: 32px;
						}
					}
					& div.see-links {
						padding: 0.5rem;
						align-content: center;
						background: var(--blue);
						white-space: nowrap;
						overflow: hidden;
					}
				}
				& .links {
					display: flex;
					flex-direction: row;
					align-items: stretch;
					& a {
						align-content: center;
						padding: 0.7rem;
						background: var(--blue-dark-1);
						color: var(--grey-light-1);
						text-decoration: none;
						&:is(:focus, :focus-visible, :active, :hover) {
							background: var(--blue-light-1);
							color: var(--grey-dark-2);
						}
					}
				}
			}
		}
	}
</style>
