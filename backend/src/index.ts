import express from 'express';
import { type IRepository, ModQueryService } from 'mclib';
import { CurseForgeRepository, ModrinthRepository } from 'mclib';
import type { Request, Response, NextFunction } from 'express';

const app = express();
const port = 3000;

function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
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

const repositories: IRepository[] = [
    new CurseForgeRepository(fetch),
    new ModrinthRepository(fetch)
];
const modQueryService = new ModQueryService(repositories);

app.post('/getMinecraftVersions', async (req: Request, res: Response) => {
    try {
        const versions = await modQueryService.getMinecraftVersions();
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.post('/searchMods', async (req: Request, res: Response) => {
    try {
        const { query, specifiedRepos = [], maxResults = 10 } = req.body;
        const results = await modQueryService.searchMods(query, specifiedRepos, maxResults);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.post('/getModReleasesFromMetadata', async (req: Request, res: Response) => {
    try {
        const { modMeta } = req.body;
        const releases = await modQueryService.getModReleasesFromMetadata(modMeta);

        // Transform sets to arrays for JSON serialization
        let jsonReleases= [];
        for (let release of releases) {
            let jsonRelease = {...release, mcVersions: Array.from(release.mcVersions), loaders: Array.from(release.loaders)};
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
app.post('/getModByDataHash', async (req: Request, res: Response) => {
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

app.post('/getModById', async (req: Request, res: Response) => {
    try {
        const { modId, specifiedRepos = [] } = req.body;
        const results = await modQueryService.searchMods(modId, specifiedRepos, 1);
        res.json(results[0] || null);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
