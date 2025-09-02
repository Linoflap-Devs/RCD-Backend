import { db } from "../db/db"
import { VwSalesTransactions } from "../db/db-types"
import { QueryResult } from "../types/global.types"

export const getPersonalSales = async (agentId: number): QueryResult<VwSalesTransactions[]> => {
    try {
        const result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .execute()

        if(!result){
            throw new Error('No sales found.')
        }
    
        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getTotalPersonalSales = async (agentId: number): QueryResult<number> => {
    try {
        const result = await db.selectFrom('Vw_SalesTransactions')
            .select(({fn, val, ref}) => [
                fn.sum(ref('NetTotalTCP')).as('TotalSales')
            ])
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .execute()

        return {
            success: true,
            data: Number(result[0].TotalSales)
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: 0,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getDivisionSales = async (divisionId: number, amount: number): QueryResult<VwSalesTransactions[]> => {
    try {
        const result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('DivisionID', '=', divisionId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .orderBy('DateFiled', 'desc')
            .execute()
    
        if(!result){
            throw new Error('No sales found.')
        }

        // Filter to get unique ProjectName records (keeps first occurrence)
        const uniqueProjects = new Map();
        const filteredResult = result.filter(record => {
            if (!uniqueProjects.has(record.ProjectName)) {
                uniqueProjects.set(record.ProjectName, true);
                return true;
            }
            return false;
        });

        const obj = filteredResult.slice(0, amount)
        
        return {
            success: true,
            data: obj
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}