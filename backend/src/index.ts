import express from 'express';
import type { Request, Response as ExpressResponse, NextFunction } from 'express';

import { cache, TTL } from './cache'
import { router } from './modsEndpoints'
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

// Logic routes
app.use('/', router);

// Helper routes
app.get('/', (_, res) => {
    res.send('Hello, world!');
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
