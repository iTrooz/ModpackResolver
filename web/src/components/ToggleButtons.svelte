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
		onchange?: ChangeEventHandler<HTMLInputElement>;
	} = $props();
</script>

<ul class="toggle_buttons_group">
	{#each entries_list as name (name)}
		<li class="toggle_button {selection.includes(name) ? 'on' : 'off'}">
			<input
				type="checkbox"
				id={composant_name + '-' + name}
				onclick={() => {
					toggle_selection(name);
				}}
				{onchange}
			/>
			<label for={composant_name + '-' + name}>{name.toUpperCase()}</label>
		</li>
	{/each}
	{#if reset}
		<li class="toggle_button reset {selection.length < 1 ? 'disabled' : ''}">
			<input
				type="checkbox"
				id="{composant_name}-reset"
				onclick={() => {
					selection = [];
				}}
				disabled={selection.length < 1}
			/>
			<label for="{composant_name}-reset">{m['filter.reset_toggle_group']().toUpperCase()}</label>
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
			& input {
				display: none;
			}
			& label {
				width: 100%;
				text-align: center;
				padding: 0.4rem 0.6rem;
				outline: none;
				border-style: solid;
				border-width: 2px 1px;
				border-color: var(--green);
				user-select: none;
				&:is(:focus, :focus-visible, :active, :hover) {
					border-color: var(--green-light-1);
				}
			}
			&.on label {
				background: var(--green);
				color: var(--grey-dark-2);
			}
			&.reset {
				label {
					border-style: solid;
					border-width: 2px 1px;
					border-color: var(--red);
					&:is(:focus, :focus-visible, :active, :hover) {
						border-color: var(--red-light-1);
					}
				}
				&.disabled label {
					border-color: var(--grey);
				}
			}
			&:first-child label {
				border-left-width: 2px;
			}
			&:last-child label {
				border-right-width: 2px;
			}
		}
	}
</style>
