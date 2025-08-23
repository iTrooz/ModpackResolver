import express, { Request, Response } from 'express';
import { type IRepository, ModQueryService } from 'mclib';
import { CurseForgeRepository, ModrinthRepository } from 'mclib';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

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
        res.json(releases);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

app.post('/getModByDataHash', async (req: Request, res: Response) => {
    try {
        const { modData } = req.body;
        // modData should be a base64 string, decode to Uint8Array
        const buffer = Buffer.from(modData, 'base64');
        const results = await modQueryService.getModByDataHash(new Uint8Array(buffer));
        res.json(results);
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
