<script lang="ts">
  import { ModpackCreator, ModRepository, ModSourceType, ModLoader } from '$lib';
  import { onMount } from 'svelte';

  let results: {
    mcConfig: { mcVersion: string; loader: ModLoader };
    mods: Array<{ name: string; release: any }>;
  } | null = null;
  
  let consoleOutput: string[] = [];
  
  async function runModpackCreator() {
    try {
      // Clear previous console output
      consoleOutput = [];
      
      // Create logic instance
      let mc = new ModpackCreator();
      
      // Configure MC version and loader
      mc.setLoaders([ModLoader.FORGE]);
      
      // Add mods to the modpack
      mc.addModFromID("ice-and-fire-dragons");
      
      // Let the logic run with the constraints
      let solutions = await mc.work(1);
      results = solutions[0];

      // Log the best compatible configuration
      consoleOutput.push(`Best Minecraft configuration: ${results.mcConfig.mcVersion} with ${results.mcConfig.loader}`);
      // Log the compatible mods with their versions
      for (let mod of results.mods) {
        consoleOutput.push(`Mod ${mod.name} with version ${mod.release.modVersion}`);
      }
    } catch (error: any) {
      consoleOutput.push(`Error: ${error.message || 'Unknown error'}`);
      console.error(error);
    }
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">ModpackCreator Example</h1>
  
  <div class="mb-4">
    <button 
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      on:click={runModpackCreator}
    >
      Run ModpackCreator
    </button>
  </div>
  
  <div class="bg-gray-900 text-green-400 p-4 rounded-md font-mono">
    <h2 class="text-white mb-2">Console Output:</h2>
    {#each consoleOutput as line}
      <div class="mb-1">{line}</div>
    {/each}
  </div>

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
