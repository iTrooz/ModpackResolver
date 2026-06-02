<script lang="ts">
	let { children } = $props();
	import { base } from '$app/paths';
	import * as m from '$msg';
</script>

<svelte:head>
	{#if import.meta.env.VITE_ANALYTICS}
		<script
			defer
			data-domain="itrooz.github.io/modpackresolver"
			src="https://viewcount.itrooz.fr/js/script.js"
		></script>
	{/if}
</svelte:head>

<header>
	<a href="{base}/" class="default-color">ModpackResolver</a>
	<!-- <div style="display: flex; gap: 1rem;">
		<a href="/about" class="default-color">About</a>
	</div> -->
	<a href="https://github.com/iTrooz/ModpackResolver" title={m['about.github_link']()}></a>
</header>

<div class="main-container">
	<main>
		{@render children()}
	</main>
</div>

<style>
	header {
		background: var(--grey-dark-1);
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		padding: 0.6rem 1rem;
		align-items: center;
		font-size: 1.4rem;
	}
	.main-container {
		display: flex;
		flex: 1;
		width: 100%;
		flex-direction: column;
		align-items: center;
	}
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		height: 100%;
		max-width: 48rem;
		gap: 2rem;
		padding: 2rem;
	}
</style>
