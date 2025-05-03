<script lang="ts">
	let { children } = $props();
</script>

<header>
	<a href="/" class="default-color">ModpackCreator</a>
	<div style="display: flex; gap: 1rem;">
		<a href="/about" class="default-color">About</a>
		<a href="/contact" class="default-color">Contact</a>
	</div>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
	}
</style>
