import { Constraints, ModAndReleases, Solution } from "..";

export interface ISolutionFinder {
    /**
     * Download releases for all mods, and return solutions that try to satisfy the constraints (Best solutions are returned first)
     * This is the method you should use for the main functionality of the class.
     * @param modIds List of mod IDs
     * @param constraints Constraints to apply on the solution
     * @param nbSolutions Max number of solutions to return
     * @returns Array of solutions
     */
    findSolutions(modIds: string[], constraints?: Constraints, nbSolutions?: number): Promise<Solution[]>;

    /**
     * Resolves releases of mods
     */
    resolveMods(modIds: string[]): Promise<ModAndReleases[]>;

    /**
     * Finds the best Minecraft configurations (version + loader) that satisfy all mods
     */
    resolveSolutions(mods: ModAndReleases[], constraints: Constraints, nbSolution: number): Solution[];
}
