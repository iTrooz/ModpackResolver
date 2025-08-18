import {
	ModrinthRepository,
	CurseForgeRepository,
	RemoteModQueryService,
	LocalSolutionFinder
} from 'mclib';
import type { ISolutionFinder, IModQueryService } from 'mclib';
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
export const modQueryService: IModQueryService = new RemoteModQueryService(fetchClient, 'https://your-server-url', repositories);
export const solutionFinder: ISolutionFinder = new LocalSolutionFinder(modQueryService);
