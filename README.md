ModpackResolver
===

This project allows you to quickly visualize which versions of Minecraft to use for a given set of mods.  
Select the mods you would like to use, and the tool will list Minecraft versions with the highest compatibility (= with the most mods available).


# Usage
## Website
Use it at https://itrooz.github.io/ModpackResolver
## CLI
Download the artifact from the [nightly release](https://github.com/iTrooz/ModpackResolver/releases)

# Authors
- Frontend: [ZeKap](https://github.com/ZeKap)
- API calls & backend: [iTrooz](https://github.com/iTrooz)

# Development
- Clone project
- Install dependencies with `bun i`
- To run the web app in development mode, go the right folder (`cd web`) and run using `bun run dev`. You may specify to proxy/cache API requests through http://localhost:8080 by running `bun run opt:proxy bun run dev`
