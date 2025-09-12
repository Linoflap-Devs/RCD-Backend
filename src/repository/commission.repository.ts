import { db } from "../db/db"
import { VwCommissionReleaseDeductionReport } from "../db/db-types"
import { QueryResult } from "../types/global.types"

export const getCommissions = async (
    filters?: { 
        agentId?: number, 
        month?: number 
    }, 
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{
    totalPages: number,
    results: VwCommissionReleaseDeductionReport[]
}> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_CommissionReleaseDeductionReport')
            .selectAll()
        
        let totalCount = await db.selectFrom('Vw_CommissionReleaseDeductionReport')
            .select(({fn}) => [fn.countAll<number>().as('count')])

        if(filters && filters.agentId){
            result = result.where('AgentID', '=', filters.agentId)
            totalCount = totalCount.where('AgentID', '=', filters.agentId)
        }

        if(filters?.month){
            const firstDay = new Date((new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date((new Date).getFullYear(), filters.month, 1)
            result = result.where('CommReleaseDate', '>', firstDay)
            result = result.where('CommReleaseDate', '<', lastDay)
            totalCount = totalCount.where('CommReleaseDate', '>', firstDay)
            totalCount = totalCount.where('CommReleaseDate', '<', lastDay)
        }



        const queryResult = await result.execute()
        const totalCountResult = await totalCount.execute()

        const totalCountPages = totalCountResult ? Number(totalCountResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCountPages / pageSize) : 1;

        if(!queryResult){
            throw new Error('No agents found.');
        }
        
        return {
            success: true,
            data: {
                totalPages: totalPages,
                results: queryResult
            }
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as {totalPages: number, results: VwCommissionReleaseDeductionReport[]},
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getTotalAgentCommissions = async (agentId: number, filters?: { month?: number }): QueryResult<number> => {
    try {
        let result = await db.selectFrom('Vw_CommissionReleaseDeductionReport')
            .select(({fn, val, ref}) => [
                fn.sum(ref('ReleasedAmount')).as('TotalCommission')
            ])
            .where('AgentID', '=', agentId)

        if(filters?.month){
            const firstDay = new Date((new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date((new Date).getFullYear(), filters.month, 1)
            result = result.where('CommReleaseDate', '>', firstDay)
            result = result.where('CommReleaseDate', '<', lastDay)
        }

        const queryResult = await result.execute()

        if(!queryResult){
            throw new Error('No agents found.');
        }

        return {
            success: true,
            data: Number(queryResult[0].TotalCommission)
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: 0,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}