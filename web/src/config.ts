import { ModrinthRepository, CurseForgeRepository, MinecraftVersions } from 'mclib';
declare const __APP_VERSION__: string;

export const fetchClient = (url: any, init: RequestInit = {}) => {
    init['headers'] = {
        ...init['headers'],
        'User-Agent': 'github.com/iTrooz/ModpackCreator v'+__APP_VERSION__
    };
    return fetch(url, init);
}

export const repositories = [new ModrinthRepository(fetchClient), new CurseForgeRepository(fetchClient)];
export const minecraftVersions = new MinecraftVersions(fetchClient);
