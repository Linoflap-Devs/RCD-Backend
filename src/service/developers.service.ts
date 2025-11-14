import { addDeveloper, editDeveloper, getDevelopers } from "../repository/developers.repository";
import { IAddDeveloper, ITblDevelopers } from "../types/developers.types";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";

export const getDevelopersService = async (
    userId: number, 
    filters?: {
        developerId?: number
        search?: string
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

export const addDeveloperService = async (userId: number, data: IAddDeveloper): QueryResult<ITblDevelopers> => {

    // check validations
    const checkExisting = await getDevelopers({developerCode: data.developerCode.toUpperCase()})

    if(checkExisting.data.data.length > 0) {
        return {
            success: false,
            data: {} as ITblDevelopers,
            error: {
                code: 400,
                message: 'Developer code already exists.'
            }
        }
    }

    const result = await addDeveloper(userId, data)

    if(!result.success) {
        logger('Failed to add developer.', result.error?.message)
        return {
            success: false,
            data: {} as ITblDevelopers,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editDeveloperService = async (userId: number, developerId: number, data: Partial<ITblDevelopers>): QueryResult<ITblDevelopers> => {

    // check validations and transforms
    if(data.DeveloperCode){
        data.DeveloperCode = undefined
    }

    console.log(data)

    const result = await editDeveloper(userId,  developerId, data)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDevelopers,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}