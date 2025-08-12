import { Constraints, ModMetadata, ModReleases, Solution } from "..";

export interface ISolutionFinder {
    /**
     * Download releases for all mods, and return solutions that try to satisfy the constraints (Best solutions are returned first)
     * This is the method you should use for the main functionality of the class.
     * @param modIds List of mod IDs
     * @param constraints Constraints to apply on the solution
     * @param nbSolutions Max number of solutions to return
     * @returns Array of solutions
     */
    findSolutions(modIds: ModMetadata[], constraints?: Constraints, nbSolutions?: number): Promise<Solution[]>;

    /**
     * Resolves releases of mods
     */
    resolveMods(modIds: ModMetadata[]): Promise<ModReleases[]>;

    /**
     * Finds the best Minecraft configurations (version + loader) that satisfy all mods
     */
    resolveSolutions(mods: ModReleases[], constraints: Constraints, nbSolution: number): Solution[];
}
