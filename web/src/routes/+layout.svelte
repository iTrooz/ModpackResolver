<script lang="ts">
	let { children } = $props();
	import { base } from '$app/paths';
</script>

<header>
	<a href="{base}/" class="default-color">ModpackCreator</a>
	<!-- <div style="display: flex; gap: 1rem;">
		<a href="/about" class="default-color">About</a>
	</div> -->
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
		align-items: stretch;
		width: 100%;
		height: 100%;
		max-width: 42rem;
		gap: 1rem;
		padding: 2rem;
	}
</style>
