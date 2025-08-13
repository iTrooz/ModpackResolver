<script lang="ts">
	import type { ModRepoRelease } from 'mclib';
	import { m } from '$msg';

	let { mod_list }: { mod_list: ModRepoRelease[] } = $props();

	const delay = (milliseconds: number) =>
		new Promise((resolve) => {
			setTimeout(resolve, milliseconds);
		});

	async function download_all(urls: string[]) {
		for (const [index, url] of urls.entries()) {
			await delay(index * 100);
			const a = document.createElement('a');
			a.style.display = 'none';
			a.href = url;
			document.body.append(a);
			a.click();
			await delay(100);
			a.remove();
		}
	}
</script>

<ul id="mods_list">
	{#each mod_list as mod (mod)}
		<li>
			<img
				src={mod.modMetadata ? mod.modMetadata.imageURL : ''}
				alt={mod.modMetadata ? mod.modMetadata.name : 'mod' + ' picture'}
			/>
			<div class="infos">
				<p>
					<a href={mod.modMetadata?.homepageURL}
						><b>{mod.modMetadata ? mod.modMetadata.name : 'mod'}</b></a
					>
					({mod.modVersion})
				</p>
				<p>
					{m['runner.results.mc_version']({ count: mod.mcVersions.size })}: {Array.from(
						mod.mcVersions
					).join(', ')}
				</p>
				<p>
					{m['runner.results.loader']({ count: mod.loaders.size })}: {Array.from(mod.loaders).join(
						', '
					)}
				</p>
			</div>
			<div class="actions">
				<a href={mod.downloadUrl}>{m['runner.results.download']()}</a>
			</div>
		</li>
	{/each}
</ul>
<button
	onclick={(event) => {
		event.preventDefault();
		download_all(
			mod_list.map((mod) => {
				return mod.downloadUrl;
			})
		);
	}}>{m['runner.results.download_all']({ count: mod_list.length })}</button
>

<style>
	#mods_list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		border: solid 2px var(--green);
		background: var(--grey-dark-1);
		overflow-y: scroll;
		max-height: 32rem;
		& li {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			gap: 1rem;
			align-items: center;
			background: var(--grey-dark-2);
			padding: 0.5rem;
			& img {
				width: 48px;
				height: 48px;
			}
			& .infos {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: start;
			}
			& .actions {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.5rem;
			}
		}
	}
	button {
		width: 100%;
		text-align: center;
		padding: 0.4rem 0.6rem;
		outline: none;
		border: solid var(--green);
		border-width: 2px;
		user-select: none;
		background-color: var(--green);
		font-size: 16px;
		color: var(--grey-dark-2);
		&:is(:active, :hover) {
			border-color: var(--green-light-1);
		}
	}
</style>
