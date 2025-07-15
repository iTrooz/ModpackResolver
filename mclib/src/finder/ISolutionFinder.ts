import { Constraints, Solution } from "..";

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
}
