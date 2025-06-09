export type MinecraftVersion = string;

export class MinecraftVersions {
  public static async getReleases(): Promise<MinecraftVersion[]> {
    const response = await fetch('https://mc-versions-api.net/api/java');
    const data = await response.json();
    return data.result;
  }
}
