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
	}
</style>
