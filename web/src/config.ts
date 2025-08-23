import {
	ModrinthRepository,
	CurseForgeRepository,
	RemoteModQueryService,
	LocalSolutionFinder,
	ModQueryService
} from 'mclib';
import type { ISolutionFinder, IModQueryService } from 'mclib';
import { logger } from 'mclib/dist/logger';
declare const __APP_VERSION__: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchClient = (url: any, init: RequestInit = {}) => {
	init['headers'] = {
		...init['headers'],
		'User-Agent': 'github.com/iTrooz/ModpackCreator v' + __APP_VERSION__
	};
	return fetch(url, init);
};

export const repositories = [
	new ModrinthRepository(fetchClient),
	new CurseForgeRepository(fetchClient)
];

declare const CONFIG_BACKEND_URL: string;
function getModQueryService(): IModQueryService {
	if (CONFIG_BACKEND_URL) {
		logger.info('Using remote mod query service at ' + CONFIG_BACKEND_URL);
		return new RemoteModQueryService(fetchClient, 'https://your-server-url', repositories);
	} else {
		logger.info('Using local mod query service');
		return new ModQueryService(repositories);
	}
}
export const modQueryService = getModQueryService();
export const solutionFinder: ISolutionFinder = new LocalSolutionFinder(modQueryService);
