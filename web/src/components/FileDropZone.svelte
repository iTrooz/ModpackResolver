<script lang="ts">
	import * as m from '$msg';
	import type { ModSearchMetadata } from 'mclib';
	import { repositories } from '../config';

	let {
		add_mod_to_list
	}: {
		add_mod_to_list: (mod: ModSearchMetadata) => void;
	} = $props();

	let isDragging = $state(false);
	let isProcessing = $state(false);
	let dragCounter = 0;

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		dragCounter++;
		if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter === 0) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragCounter = 0;
		isDragging = false;

		if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
			return;
		}

		isProcessing = true;
		
		try {
			for (const file of Array.from(e.dataTransfer.files)) {
				// Only process .jar files (mod files)
				if (!file.name.toLowerCase().endsWith('.jar')) {
					console.warn(`Skipping non-jar file: ${file.name}`);
					continue;
				}

				await processModFile(file);
			}
		} catch (error) {
			console.error('Error processing dropped files:', error);
		} finally {
			isProcessing = false;
		}
	}

	async function processModFile(file: File) {
		try {
			// Read file as Uint8Array
			const arrayBuffer = await file.arrayBuffer();
			const modData = new Uint8Array(arrayBuffer);

			// Try to identify the mod using each repository
			for (const repo of repositories) {
				try {
					const modInfo = await repo.getByDataHash(modData);
					if (modInfo) {
						console.log(`Found mod: ${modInfo.name} from ${repo.getRepositoryName()}`);
						add_mod_to_list(modInfo);
						return; // Successfully identified, stop trying other repos
					}
				} catch (error) {
					console.warn(`Failed to identify mod with ${repo.getRepositoryName()}:`, error);
				}
			}

			console.warn(`Could not identify mod file: ${file.name}`);
		} catch (error) {
			console.error(`Error processing file ${file.name}:`, error);
		}
	}
</script>

<div 
	class="dropzone {isDragging ? 'dragging' : ''} {isProcessing ? 'processing' : ''}"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	{#if isProcessing}
		<div class="status">
			<span class="icon">⏳</span>
			<p>{m.processing_mod_files()}</p>
		</div>
	{:else if isDragging}
		<div class="status">
			<span class="icon">📦</span>
			<p>{m.drop_mods_here()}</p>
		</div>
	{:else}
		<div class="status">
			<span class="icon">⬆️</span>
			<p>{m.drag_drop_mods()}</p>
			<small>{m.drag_drop_subtitle()}</small>
		</div>
	{/if}
</div>
