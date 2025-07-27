import { Constraints, ModAndReleases, Solution } from "..";

export interface ISolutionFinder {
    /**
     * Download releases for all mods, and return solutions that try to satisfy the constraints (Best solutions are returned first)
     * This is the method you should use for the main functionality of the class.
     * @param mods List of mod IDs
     * @param constraints Constraints to apply on the solution
     * @param nbSolution Max number of solutions to return
     * @returns Array of solutions
     */
    findSolutions(mods: string[], constraints?: Constraints, nbSolution?: number): Promise<Solution[]>;

    /**
     * Resolves mod IDs to their releases metadata
     * @param modIds List of mod IDs to resolve
     * @returns Array of ModAndReleases objects
     */
    resolveMods(modIds: string[]): Promise<ModAndReleases[]>;

    /**
     * Finds the best Minecraft configurations (version + loader) that satisfy all mods
     * @param mods List of mods with their releases
     * @param nbSolution Maximum number of solutions to return
     * @returns Array of compatible solutions
     */
    resolveSolutions(mods: ModAndReleases[], constraints: Constraints, nbSolution: number): Solution[];
}
