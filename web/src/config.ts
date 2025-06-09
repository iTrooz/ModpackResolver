import { ModrinthRepository, CurseForgeRepository, MinecraftVersions } from 'mclib';

export const fetchClient = (url: any, init: RequestInit = {}) => {
    init['headers'] = {
        ...init['headers'],
        'User-Agent': 'github.com/iTrooz/ModpackCreator'
    };
    return fetch(url, init);
}

export const repositories = [new ModrinthRepository(fetchClient), new CurseForgeRepository(fetchClient)];
export const minecraftVersions = new MinecraftVersions(fetchClient);
