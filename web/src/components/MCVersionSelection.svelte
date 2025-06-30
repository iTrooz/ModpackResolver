<script lang="ts">
	import type { MCVersion } from 'mclib';

	import * as m from '$msg';
	let {
		min_mc_version = $bindable(),
		max_mc_version = $bindable(),
		mc_versions
	}: {
		min_mc_version: MCVersion;
		max_mc_version: MCVersion;
		mc_versions: MCVersion[];
	} = $props();
</script>

<form
	class="mc_version_selection"
	onsubmit={(e: Event) => {
		e.preventDefault();
	}}
>
	<datalist id="mc_version_selection_list">
		{#each mc_versions.toReversed() as mc_version (mc_version)}
			<option value={mc_version}></option>
		{/each}
	</datalist>
	<input
		type="text"
		placeholder={m.min_mc_version()}
		bind:value={min_mc_version}
		list="mc_version_selection_list"
		size="8"
	/>
	<div class="sliders">
		<input
			type="range"
			bind:value={
				() =>
					mc_versions.findIndex((value) => {
						return value == min_mc_version;
					}),
				(v: number) => {
					if (
						v <=
						mc_versions.findIndex((value) => {
							return value == max_mc_version;
						})
					) {
						min_mc_version = mc_versions[v];
					}
				}
			}
			min="0"
			max={mc_versions.length - 1}
		/>
		<input
			type="range"
			bind:value={
				() =>
					mc_versions.findIndex((value) => {
						return value == max_mc_version;
					}),
				(v: number) => {
					if (
						v >=
						mc_versions.findIndex((value) => {
							return value == min_mc_version;
						})
					) {
						max_mc_version = mc_versions[v];
					}
				}
			}
			min="0"
			max={mc_versions.length - 1}
		/>
	</div>
	<input
		type="text"
		placeholder={m.max_mc_version()}
		bind:value={max_mc_version}
		list="mc_version_selection_list"
		size="8"
	/>
</form>

<style>
	form.mc_version_selection {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		& .sliders {
			flex: 1;
			position: relative;
			height: 20px;
			display: flex;
			align-items: center;

			&::before {
				content: '';
				position: absolute;
				height: 50%;
				width: 100%;
				outline: solid 2px var(--green);
				z-index: 1;
			}

			& input[type='range'] {
				position: absolute;
				inset: 0;
				margin: 0;
				width: 100%;
				z-index: 2;
				-webkit-appearance: none;
				appearance: none;
				background: transparent;
				pointer-events: none;

				&::-webkit-slider-thumb {
					-webkit-appearance: none;
					appearance: none;
					height: 20px;
					width: 12px;
					border-radius: 0;
					background: var(--grey-dark-2);
					border: solid 2px var(--green);
					cursor: pointer;
					pointer-events: auto;
				}
				&::-moz-range-thumb {
					-webkit-appearance: none;
					appearance: none;
					height: 20px;
					width: 12px;
					border-radius: 0;
					background: var(--grey-dark-2);
					border: solid 2px var(--green);
					cursor: pointer;
					pointer-events: auto;
				}

				&::-webkit-slider-thumb:hover {
					background: var(--grey-dark-1);
					border-color: var(--green-light-1);
				}
				&::-moz-range-thumb:hover {
					background: var(--grey-dark-1);
					border-color: var(--green-light-1);
				}

				&::-webkit-slider-thumb:active {
					background: var(--green);
					cursor: pointer;
				}
				&::-moz-range-thumb:active {
					background: var(--green);
					cursor: pointer;
				}
			}

			/* 5. The MASKING trick: We use the bottom slider (min_mc_version)
				      to "cover up" the green fill from the left. */
			& input[type='range']:first-of-type {
				z-index: 3;
				&::-moz-range-progress {
					background: var(--grey-dark-2);
					height: 50%;
				}
			}
			& input[type='range']:not(:first-of-type) {
				&::-moz-range-progress {
					background: var(--green-dark-1);
					height: 50%;
				}
			}
		}
		& input[type='text'] {
			background: var(--grey-dark-1);
			outline: solid 2px var(--green);
			border: none;
			color: var(--grey-light-2);
			padding: 0.4rem 0.6rem;
			&:is(:active, :focus, :focus-visible, :hover) {
				outline-color: var(--green-light-1);
			}
		}
	}
</style>
