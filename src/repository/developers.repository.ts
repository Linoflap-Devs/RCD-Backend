import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { ITblDevelopers } from "../types/developers.types";

export const getDevelopers = async (
    filters?: {developerId?: number}, 
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, data:ITblDevelopers[]}> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let baseQuery = db.selectFrom('Tbl_Developers')
            .selectAll()

        let countQuery = db.selectFrom('Tbl_Developers')
            .select(({fn}) => fn.countAll<number>().as('count'))

        if(filters && filters.developerId){
            baseQuery = baseQuery.where('DeveloperID', '=', filters.developerId)
            countQuery = countQuery.where('DeveloperID', '=', filters.developerId)
        }

        baseQuery = baseQuery.orderBy('DeveloperName', 'asc')

        if(pagination && pagination.page && pagination.pageSize){
            console.log(offset)
            baseQuery = baseQuery.offset(offset).fetch(pagination.pageSize)
        }

        const result = await baseQuery.execute()
        const countResult = await countQuery.execute()

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        return {
            success: true,
            data: {
                totalResults: totalCount,
                totalPages: totalPages,
                data: result
            }
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, data:ITblDevelopers[]},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}