export type MinecraftVersion = string;

export class MinecraftVersions {
  private fetchClient: typeof fetch;

  constructor(fetchClient: typeof fetch) {
    this.fetchClient = fetchClient;
  }

  public async getReleases(): Promise<MinecraftVersion[]> {
    const response = await this.fetchClient('https://mc-versions-api.net/api/java');
    const data = await response.json();
    return data.result;
  }
}
