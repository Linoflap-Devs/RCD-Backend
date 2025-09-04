import { db } from "../db/db"
import { TblSalesBranch, TblSalesSector, VwSalesTransactions } from "../db/db-types"
import { QueryResult } from "../types/global.types"
import { logger } from "../utils/logger"

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

export const getTotalDivisionSales = async (divisionId: number): QueryResult<number> => {
    try {
        const result = await db.selectFrom('Vw_SalesTransactions')
                .select(({fn, val, ref}) => [
                    fn.sum(ref('NetTotalTCP')).as('TotalSales')
                ])
                .where('DivisionID', '=', divisionId)
                .where('SalesStatus', '<>', 'ARCHIVED')
                .execute()
    
        return {
            success: true,
            data: Number(result[0].TotalSales)
        }
    }

    catch (err: unknown){
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

export const getDivisionSales = async (divisionId: number, filters?:{amount?: number,  agentId?: number, isUnique?: boolean}, pagination?: {page?: number, pageSize?: number}): QueryResult<VwSalesTransactions[]> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? (filters?.amount ?? undefined); // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('DivisionID', '=', divisionId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('AgentName', '<>', '')

        if(filters && filters.agentId){
            logger('getDivisionSales | Filtering by agentId', {agentId: filters.agentId})
            result = result.where('AgentID', '=', filters.agentId)
        }

        result = result.orderBy('DateFiled', 'desc')

        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
        }

        const queryResult = await result.execute();
    
        if(!result){
            throw new Error('No sales found.')
        }

        let filteredResult = queryResult

        // Filter to get unique ProjectName records (keeps first occurrence)
        if(filters && filters.isUnique  && filters.isUnique === true){
            const uniqueProjects = new Map();
            filteredResult = queryResult.filter(record => {
                if (!uniqueProjects.has(record.ProjectName)) {
                    uniqueProjects.set(record.ProjectName, true);
                    return true;
                }
                return false;
            })
        }

        if(filters && filters.amount){
            const amount = filters.amount
            filteredResult = filteredResult.slice(0, amount)
        }
        
        
        return {
            success: true,
            data: filteredResult
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

export const getSalesTransactionDetail = async (salesTransDtlId: number): QueryResult<VwSalesTransactions> => {
    try {
        const result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('SalesTransDtlID', '=', salesTransDtlId)
            .executeTakeFirst();
        
        if(!result){
            return {
                success: false,
                data: {} as VwSalesTransactions,
                error: {
                    code: 404,
                    message: 'No sales found.'
                }
            }
        }
    
        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as VwSalesTransactions,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getSalesBranch = async (branchId: number): QueryResult<TblSalesBranch> => {
    try {
        const result = await db.selectFrom('Tbl_SalesBranch')
            .selectAll()
            .where('BranchID', '=', branchId)
            .executeTakeFirst();
        
        if(!result){
            return {
                success: false,
                data: {} as TblSalesBranch,
                error: {
                    code: 404,
                    message: 'No sales branch found.'
                }
            }
        }
    
        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as TblSalesBranch,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getSalesSector = async (sectorId: number): QueryResult<TblSalesSector> => {
    try {
        const result = await db.selectFrom('Tbl_SalesSector')
            .selectAll()
            .where('SectorID', '=', sectorId)
            .executeTakeFirst();
        
        if(!result){
            return {
                success: false,
                data: {} as TblSalesSector,
                error: {
                    code: 404,
                    message: 'No sales sector found.'
                }
            }
        }
    
        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as TblSalesSector,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}