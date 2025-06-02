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

<main>
	{@render children()}
</main>

<style>
	header {
		background: var(--grey-dark-1);
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		padding: 0.6rem 1rem;
		align-items: center;
	}
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		flex: 1;
		margin: 2rem;
	}
</style>
