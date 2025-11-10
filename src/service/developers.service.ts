import { getDevelopers } from "../repository/developers.repository";
import { ITblDevelopers } from "../types/developers.types";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";

export const getDevelopersService = async (
    userId: number, 
    filters?: {
        developerId?: number
    },
    pagination?: {
        page?: number,
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, data: ITblDevelopers[]}> => {

    console.log(filters, pagination)

    const result = await getDevelopers(
        filters, 
        pagination
    )

    if(!result.success) {
        logger('Failed to get developers.', result.error?.message)
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, data: ITblDevelopers[]},
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}