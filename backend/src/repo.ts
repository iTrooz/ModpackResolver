import express from 'express';
import { IRepository, ModRepositoryName } from 'mclib';
import { createModRepository } from 'mclib/src/ModpackCreator';

export const repositoryRouter = express.Router({ mergeParams: true });

interface RequestWithRepository extends express.Request {
    repository?: IRepository;
}

const repoMiddleware = (req: RequestWithRepository, res: express.Response, next: express.NextFunction) => {
    const repositoryName = req.params.repository;

    if (!repositoryName) {
        res.status(400).json({ error: 'Repository parameter is required' });
        return;
    }


    const repository = createModRepository(repositoryName as ModRepositoryName, fetch);
    if (!repository) {
        res.status(404).json({
            error: `Repository '${repositoryName}' not found`
        });
        return;
    }

    req.repository = repository;
    next();
};
repositoryRouter.use(repoMiddleware);

repositoryRouter.get('/foo', async (req: RequestWithRepository, res) => {
    try {
        const repository = req.repository!;
        const repositoryName = repository.getRepositoryName();

        // Example implementation of "foo" - you can replace this with your actual logic
        const response = {
            message: `Hello from ${repositoryName} repository!`,
            repositoryName: repositoryName,
            timestamp: new Date().toISOString(),
            // Add any other repository-specific data you want to return
        };

        res.json(response);
    } catch (error) {
        console.error('Error in foo endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
