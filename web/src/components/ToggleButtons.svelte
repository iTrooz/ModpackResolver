<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';
	import * as m from '$msg';

	function toggle_selection(key: string) {
		if (!selection.includes(key)) {
			selection.push(key);
		} else {
			const index = selection.indexOf(key, 0);
			if (index > -1) {
				selection.splice(index, 1);
			}
		}
	}

	let {
		selection = $bindable(),
		entries_list,
		name: composant_name,
		reset = false,
		onchange
	}: {
		selection: string[];
		entries_list: string[];
		name: string;
		reset?: boolean;
		onchange?: () => void;
	} = $props();
</script>

<ul class="toggle_buttons_group">
	{#each entries_list as name (name)}
		<li class="toggle_button {selection.includes(name) ? 'on' : 'off'}">
			<button
				id={composant_name + ' ' + name}
				onclick={() => {
					toggle_selection(name);
					if (onchange) onchange();
				}}>{name.toUpperCase()}</button
			>
		</li>
	{/each}
	{#if reset}
		<li class="toggle_button reset {selection.length < 1 ? 'disabled' : ''}">
			<button
				id="{composant_name}-reset"
				onclick={() => {
					selection = [];
					if (onchange) onchange();
				}}
				disabled={selection.length < 1}
			>
				{m['filter.reset_toggle_group']().toUpperCase()}
			</button>
		</li>
	{/if}
</ul>

<style>
	ul.toggle_buttons_group {
		display: flex;
		flex-direction: row;
		gap: 0;
		align-items: baseline;
		flex-wrap: wrap;
		& li.toggle_button {
			display: flex;
			flex: 1;
			&::marker {
				content: none;
			}
			& button {
				width: 100%;
				text-align: center;
				padding: 0.4rem 0.6rem;
				outline: none;
				border-style: solid;
				border-width: 2px 1px;
				border-color: var(--green);
				user-select: none;
				background-color: var(--grey-dark-2);
				font-size: 16px;
				color: var(--grey-light-1);
				&:is(:active, :hover) {
					border-color: var(--green-light-1);
				}
			}
			&.on button {
				background: var(--green);
				color: var(--grey-dark-2);
			}
			&.reset {
				button {
					border-style: solid;
					border-width: 2px 1px;
					border-color: var(--red);
					&:is(:focus, :focus-visible, :active, :hover) {
						border-color: var(--red-light-1);
					}
				}
				&.disabled button {
					border-color: var(--grey);
				}
			}
			&:first-child button {
				border-left-width: 2px;
			}
			&:last-child button {
				border-right-width: 2px;
			}
		}
	}
</style>
