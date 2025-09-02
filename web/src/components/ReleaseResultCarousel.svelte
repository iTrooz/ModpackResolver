<script lang="ts">
	import type { ModRepoMetadata, Solution } from 'mclib';
	import { ModResultsList } from '$cmpts';
	import { m } from '$msg';
	import { fly } from 'svelte/transition';

	let { results, selected_mods }: { results: Solution[]; selected_mods: ModRepoMetadata[] } =
		$props();
	let [is_left_button_visible, is_right_button_visible]: [
		is_left_button_visible: boolean,
		is_right_button_visible: boolean
	] = $state([false, false]);
	let current_page: number = $state(0);
	let [can_go_prev, can_go_next]: [can_go_prev: boolean, can_go_next: boolean] = $derived([
		current_page != 0,
		current_page != results.length - 1
	]);

	function update_page(carousel: HTMLElement | null) {
		if (carousel === null) return;
		const child_width = carousel.children[0].clientWidth;
		const scrolled = carousel?.scrollLeft;
		current_page = Math.ceil(scrolled / child_width);
	}

	function prev_page() {
		if (!can_go_prev) return;
		const prev_page = Math.max(current_page - 1, 0);
		document.getElementById('page_' + prev_page)?.scrollIntoView();
		current_page = prev_page;
		can_go_prev = current_page != 0;
		can_go_next = current_page != results.length - 1;
	}

	function next_page() {
		if (!can_go_next) return;
		const next_page = Math.min(current_page + 1, results.length - 1);
		document.getElementById('page_' + next_page)?.scrollIntoView();
		current_page = next_page;
	}

	function go_page(page: number) {
		document.getElementById('page_' + page)?.scrollIntoView();
		current_page = Math.max(Math.min(page, results.length - 1), 0);
	}
</script>

<section>
	<div
		id="left"
		role="navigation"
		onmouseenter={() => {
			is_left_button_visible = true;
		}}
		onmouseleave={() => {
			is_left_button_visible = false;
		}}
	>
		{#if is_left_button_visible}
			<button transition:fly={{ x: '-3.5rem' }} onclick={prev_page} disabled={!can_go_prev}
				>&lt;</button
			>
		{/if}
	</div>
	<h3>{m['runner.remaining_results']({ nb_remaining: results.length })}</h3>
	<ul
		id="carousel"
		onscrollend={() => {
			update_page(document.getElementById('carousel'));
		}}
	>
		{#each results as result, _id (result)}
			<li id={'page_' + _id.toString()}>
				<div class="infos">
					<div class="config">
						<p>
							{m['runner.results.mc_version']({ count: 1 })}:
							<b>{result.mcConfig.mcVersion}</b>
						</p>
						<p>
							{m['runner.results.loader']({ count: 1 })}:
							<b>{result.mcConfig.loader}</b>
						</p>
					</div>
					<p>
						<b>{result.mods.length}</b>/{selected_mods.length}
						{m['runner.results.mod']({ count: selected_mods.length })}
					</p>
				</div>

				<ModResultsList mod_list={result.mods} />
			</li>
		{/each}
	</ul>
	<div
		id="right"
		role="navigation"
		onmouseenter={() => {
			is_right_button_visible = true;
		}}
		onmouseleave={() => {
			is_right_button_visible = false;
		}}
	>
		{#if is_right_button_visible}
			<button transition:fly={{ x: '3.5rem' }} onclick={next_page} disabled={!can_go_next}
				>&gt;</button
			>
		{/if}
	</div>
	<ul class="pagination">
		{#each results as _, id (_)}
			<li>
				<button
					class={current_page === id ? 'current' : ''}
					onclick={() => {
						go_page(id);
					}}
				>
					{id + 1}
				</button>
			</li>
		{/each}
	</ul>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		gap: 0.8rem;
		padding: 2rem 0;
		overflow: hidden;
		border: solid 1px var(--grey-dark-1);
		position: relative;
		& h3 {
			padding-left: 2rem;
		}
		& :is(#left, #right) {
			position: absolute;
			top: 0;
			height: 100%;
			width: 6rem;
			&#left {
				left: 0;
				& button {
					left: 1rem;
				}
			}
			&#right {
				right: 0;
				& button {
					right: 1rem;
				}
			}
			& button {
				position: absolute;
				width: 2.5rem;
				height: 2.5rem;
				top: 50%;
				transform: translateY(-50%);
				padding: 0.1rem;
				font-size: 1.5rem;
				color: var(--grey-dark-2);
				background: var(--green);
				outline: none;
				border: solid 2px var(--green);
				border-radius: 0;
				&:is(:hover, :active) {
					border-color: var(--green-light-1);
				}
				&:disabled {
					background: var(--grey);
					border-color: var(--grey);

					&:is(:hover, :active) {
						border-color: var(--grey);
					}
				}
			}
		}
		& ul#carousel {
			flex: none;
			display: flex;
			flex-flow: row nowrap;
			gap: 1rem;
			width: 100%;
			overflow-x: auto;
			scroll-snap-type: x mandatory;
			scroll-behavior: smooth;
			& li {
				&:first-child {
					padding-left: 2rem;
				}
				&:last-child {
					padding-right: 2rem;
				}
				flex: none;
				list-style-type: none;
				width: 90%;
				scroll-snap-align: center;
				scroll-snap-stop: always;
				display: flex;
				flex-direction: column;
				gap: 0.8rem;
				& .infos {
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					align-items: end;
					& .config {
						display: flex;
						flex-direction: column;
						gap: 0.5rem;
					}
				}
			}
		}
		& ul.pagination {
			display: flex;
			flex-direction: row;
			justify-content: center;
			width: 100%;
			gap: 0.8rem;
			& li {
				list-style-type: none;
				& button {
					width: 2rem;
					height: 2rem;
					outline: none;
					background: var(--grey-dark-2);
					border: solid 2px var(--green);
					color: var(--grey-light-2);
					font-size: inherit;
					&:is(:active, :hover, :focus-visible) {
						border-color: var(--green-light-1);
					}
					&.current {
						background-color: var(--green);
						color: var(--grey-dark-2);
					}
				}
			}
		}
	}
</style>
