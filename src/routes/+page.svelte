<script lang="ts">
  import { ModpackCreator, ModRepository, ModSourceType, ModLoader } from '$lib';
  import { onMount } from 'svelte';

  let results: {
    mcConfig: { mcVersion: string; loader: ModLoader };
    mods: Array<{ name: string; release: any }>;
  } | null = null;
  
  let isLoading = false;
  let error: string | null = null;
  
  async function runModpackCreator() {
    try {
      // Reset state
      results = null;
      error = null;
      isLoading = true;
      
      // Create logic instance
      let mc = new ModpackCreator();
      
      // Configure MC version and loader
      mc.setLoaders([ModLoader.FORGE]);
      
      // Add mods to the modpack
      mc.addModFromID("ice-and-fire-dragons");
      
      // Let the logic run with the constraints
      let solutions = await mc.work(1);
      results = solutions[0];
      
    } catch (err: any) {
      error = err.message || 'Unknown error';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">ModpackCreator Example</h1>
  
  <div class="mb-4">
    <button 
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded {isLoading ? 'opacity-50 cursor-not-allowed' : ''}"
      on:click={runModpackCreator}
      disabled={isLoading}
    >
      {#if isLoading}
        Processing...
      {:else}
        Run ModpackCreator
      {/if}
    </button>
  </div>
  
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline">{error}</span>
    </div>
  {/if}

  {#if isLoading}
    <div class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  {/if}

  {#if results}
    <div class="mt-8">
      <h2 class="text-xl font-bold mb-2">Results:</h2>
      <div class="bg-gray-100 p-4 rounded-md overflow-auto">
        <h3 class="font-bold">Best Minecraft Configuration:</h3>
        <p>Version: {results.mcConfig.mcVersion}</p>
        <p>Loader: {results.mcConfig.loader}</p>
        
        <h3 class="font-bold mt-4">Compatible Mods:</h3>
        <ul class="list-disc ml-6">
          {#each results.mods as mod}
            <li>
              <strong>{mod.name}</strong>: {mod.release.modVersion}
              <ul class="list-circle ml-4 text-sm">
                <li>Loaders: {mod.release.loaders.join(', ')}</li>
                <li>MC Versions: {mod.release.mcVersions.join(', ')}</li>
              </ul>
            </li>
          {/each}
        </ul>
      </div>
      
      <h3 class="font-bold mt-4">Raw Data:</h3>
      <pre class="bg-gray-100 p-4 rounded-md overflow-auto text-xs">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  {/if}
</div>
