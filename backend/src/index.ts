import express from 'express';
import { type IRepository, LocalModQueryService } from 'mclib';
import { CurseForgeRepository, ModrinthRepository } from 'mclib';
import type { Request, Response as ExpressResponse, NextFunction } from 'express';

import { cache, cachedFetchDecorator, TTL } from './cache'
import pkg from '../package.json';

const app = express();
const port = 3000;

function loggerMiddleware(req: Request, res: ExpressResponse, next: NextFunction) {
    const { method, url } = req;
    const start = Date.now();
    let responseBody: any;
    // Monkey-patch res.json to capture body
    const originalJson = res.json;
    res.json = function (body: any) {
        responseBody = body;
        return originalJson.call(this, body);
    };
    res.on('finish', () => {
        const status = res.statusCode;
        const duration = Date.now() - start;
        let logMsg = `${status} ${method} ${url} (${duration}ms)`;
        if (status === 500 && responseBody && responseBody.error) {
            logMsg += ` | error: ${responseBody.error}`;
        }
        console.log(logMsg);
    });
    next();
}

// Middleware to parse JSON bodies
app.use(express.json());
app.use(loggerMiddleware);
app.get('/', (_, res) => {
    res.send('Hello, world!');
});

function fetchMainDecorator(fetchFunc: typeof fetch): typeof fetch {
    return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const options: RequestInit = { ...init };
        options.headers = {
            ...(init && init.headers ? init.headers : {}),
            'User-Agent': 'github.com/iTrooz/ModpackCreator/backend v' + pkg.version
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

app.post('/getMinecraftVersions', async (_: Request, res: ExpressResponse) => {
    try {
        const versions = await modQueryService.getMinecraftVersions();
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.post('/searchMods', async (req: Request, res: ExpressResponse) => {
    try {
        const { query, specifiedRepos = [], maxResults = 10 } = req.body;
        const results = await modQueryService.searchMods(query, specifiedRepos, maxResults);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.post('/getModReleasesFromMetadata', async (req: Request, res: ExpressResponse) => {
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
app.post('/getModByDataHash', async (req: Request, res: ExpressResponse) => {
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

app.post('/getModById', async (req: Request, res: ExpressResponse) => {
    try {
        const { modId, specifiedRepos = [] } = req.body;
        const results = await modQueryService.searchMods(modId, specifiedRepos, 1);
        res.json(results[0] || null);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.get("/cache-info", async (_, res) => {
  res.json({
    size: cache.size,              // # of entries
    maxSize: cache.maxSize,        // max allowed
    calculatedSize: cache.calculatedSize, // total bytes used
    TTL: TTL
  });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
