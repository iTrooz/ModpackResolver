import express from 'express';
import { ModRepositoryName, type IRepository } from 'mclib';
import { CurseForgeRepository, ModrinthRepository } from 'mclib';
import { repositoryRouter } from './repo';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (_, res) => {
    res.send('Hello, world!');
});

// Mount the repository router under /repositories/:repository
app.use('/repositories/:repository', repositoryRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
