<script lang="ts">
  import { ModpackCreator, ModRepository, ModSourceType, ModLoader } from '$lib';
  import { onMount } from 'svelte';

  let results: {
    mods: Array<{ name: string; version: string; loader: string }>;
  } | null = null;
  
  let consoleOutput: string[] = [];
  
  function runModpackCreator() {
    // Clear previous console output
    consoleOutput = [];
    
    // Create logic instance
    let mc = new ModpackCreator();
    
    // Configure MC version and loader
    mc.setExactVersion("1.21.1");
    mc.chooseMinimalVersion("1.12.2");
    mc.setLoaders([ModLoader.FORGE]);
    
    // Add mods to the modpack
    mc.addModFromHash("3f786850e387550fdab836ed7e6dc881de23001b");
    mc.addModFromID("ice-and-fire-dragons");
    mc.addModFromName("JourneyMap");
    
    // Let the logic run with the constraints
    results = mc.work();
    
    // Log the results to our virtual console
    for (let mod of results.mods) {
      consoleOutput.push(`Mod ${mod.name} with version ${mod.version} on loader ${mod.loader}`);
    }
  }
  
  onMount(() => {
    runModpackCreator();
  });
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
      <h2 class="text-xl font-bold mb-2">Raw Results:</h2>
      <pre class="bg-gray-100 p-4 rounded-md overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  {/if}
  
  <div class="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
    <h2 class="font-bold">Usage Example Code:</h2>
    <pre class="bg-gray-100 p-4 rounded-md overflow-auto mt-2">
{`import { ModpackCreator, ModRepository, ModSourceType, ModLoader } from '$lib';
      
// Create logic instance
let mc = new ModpackCreator();

// Configure MC version and loader
mc.setExactVersion("1.21.1");
mc.chooseMinimalVersion("1.12.2");
mc.setLoaders([ModLoader.FORGE]);

// Add mods to the modpack
mc.addModFromHash("3f786850e387550fdab836ed7e6dc881de23001b");
mc.addModFromID("ice-and-fire-dragons");
mc.addModFromName("JourneyMap");

// Let the logic run with the constraints
let result = mc.work();

for (let mod of result.mods) {
    console.log(\`Mod \${mod.name} with version \${mod.version} on loader \${mod.loader}\`);
}`}
    </pre>
  </div>
</div>
