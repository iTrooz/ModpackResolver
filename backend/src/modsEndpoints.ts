import { CurseForgeRepository, IRepository, LocalModQueryService, ModrinthRepository } from "mclib";
import type { Request, Response as ExpressResponse } from 'express';
import { Router } from 'express';
import { cachedFetchDecorator } from "./cache";
import pkg from '../package.json';

function fetchMainDecorator(fetchFunc: typeof fetch): typeof fetch {
    return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const options: RequestInit = { ...init };
        options.headers = {
            ...(init && init.headers ? init.headers : {}),
            'User-Agent': 'github.com/iTrooz/ModpackResolver/backend v' + pkg.version
        };
        return fetchFunc(input, options);
    };
}

const fetchFunction = cachedFetchDecorator(fetchMainDecorator(fetch));


const repositories: IRepository[] = [
    new CurseForgeRepository(fetchFunction),
    new ModrinthRepository(fetchFunction)
];
const modQueryService = new LocalModQueryService(repositories);


export const router = Router();

router.post('/getMinecraftVersions', async (_: Request, res: ExpressResponse) => {
    try {
        const versions = await modQueryService.getMinecraftVersions();
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

router.post('/searchMods', async (req: Request, res: ExpressResponse) => {
    try {
        const { query, specifiedRepos = [], maxResults = 10 } = req.body;
        const results = await modQueryService.searchMods(query, specifiedRepos, maxResults);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

router.post('/getModReleasesFromMetadata', async (req: Request, res: ExpressResponse) => {
    try {
        const { modMeta } = req.body;
        const releases = await modQueryService.getModReleasesFromMetadata(modMeta);

        // Transform sets to arrays for JSON serialization
        const jsonReleases= [];
        for (const release of releases) {
            const jsonRelease = {...release, mcVersions: Array.from(release.mcVersions), loaders: Array.from(release.loaders)};
            jsonReleases.push(jsonRelease);
        }

        res.json(jsonReleases);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

type GetModByDataHashRequest = {
    hash: string,
    repository: string
};
router.post('/getModByDataHash', async (req: Request, res: ExpressResponse) => {
    try {
        const body: GetModByDataHashRequest = req.body;
        for (const repo of repositories) {
            if (repo.getRepositoryName() === body.repository) {
                const result = await repo.getByDataHash(body.hash);
                return res.json(result);
            }
        }
        res.json(null);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

router.post('/getModById', async (req: Request, res: ExpressResponse) => {
    try {
        const { modId, specifiedRepos = [] } = req.body;
        const results = await modQueryService.searchMods(modId, specifiedRepos, 1);
        res.json(results[0] || null);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
