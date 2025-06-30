import { MCVersion } from "./ModpackCreator";

export class MinecraftVersions {
  public static async getReleases(): Promise<MCVersion[]> {
    try {
      const response = await fetch("https://mc-versions-api.net/api/java");
      const data = await response.json();
      return data.result.reverse();
    } catch (error) {
      console.error("Failed to fetch Minecraft versions:", error);
      return ["error"];
    }
  }
}
