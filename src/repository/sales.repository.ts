import { endOfDay, format, startOfDay } from "date-fns";
import { db } from "../db/db"
import { TblAgentPendingSalesDtl, TblSalesBranch, TblSalesSector, TblSalesTrans, VwAgents, VwDivisionSalesTarget, VwSalesTrans, VwSalesTransactions } from "../db/db-types"
import { QueryResult } from "../types/global.types"
import { logger } from "../utils/logger"
import { AgentPendingSale, AgentPendingSalesDetail, AgentPendingSalesWithDetails, DeveloperSales, EditPendingSaleDetail, FnDivisionSales, FnSalesTarget, IAgentPendingSale, ITblSalesTrans, SalesTargetTotals, SaleStatus } from "../types/sales.types";
import { TZDate } from "@date-fns/tz";
import { sql } from "kysely";
import { SalesStatusText } from "../types/sales.types";
import { IImage, IImageBase64 } from "../types/image.types";
import { CommissionDetailPositions, CommissionRate, CommissionRateDetail } from "../types/commission.types";

// UTILS
function padRandomNumber(num: number, length: number): string {
    return num.toString().padStart(length, '0');
}

async function generateUniqueTranCode(): Promise<string> {
    const dateStr = format(new Date(), 'yyyyMMdd'); // YYYYMMDD
    let tranCode = '';
    let exists = true;

    while (exists) {
        const randomNum = Math.floor(Math.random() * 999999); // 0 - 999999
        const randomStr = padRandomNumber(randomNum, 6); // ensures 6 digits
        tranCode = `S-${dateStr}${randomStr}-001`;

        // Check if transaction code exists in DB
        const found = await db.selectFrom('Tbl_AgentPendingSales')
            .select('PendingSalesTranCode')
            .where('PendingSalesTranCode', '=', tranCode)
            .executeTakeFirst();

        exists = Boolean(found);
    }

    return tranCode;
}

export const getSalesTrans = async (
    filters?: {
        divisionId?: number,
        month?: number,
        year?: number,
        agentId?: number,
        createdBy?: number,
        developerId?: number,
        isUnique?: boolean,
        salesBranch?: number
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, results: VwSalesTrans[]}> => {

    try {
        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('vw_SalesTrans')
            .selectAll()
            .where('SalesStatus', '<>', 'ARCHIVED')

        let totalCountResult = await db
            .selectFrom("vw_SalesTrans")
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.divisionId) {
            result = result.where('DivisionID', '=', filters.divisionId)
            totalCountResult = totalCountResult.where('DivisionID', '=', filters.divisionId)
        }

        if(filters && filters.developerId){
            result = result.where('DeveloperID', '=', filters.developerId)
            totalCountResult = totalCountResult.where('DeveloperID', '=', filters.developerId)
        }
        

        if(filters && filters.salesBranch){
            result = result.where('SalesBranchID', '=', filters.salesBranch)
            totalCountResult = totalCountResult.where('SalesBranchID', '=', filters.salesBranch)
        }

        if(filters && filters.month){
            const year = filters.year ? filters.year : new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
            
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());

            // const firstDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month - 1, 1)
            // const lastDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month, 1)
            result = result.where('ReservationDateFormatted', '>', firstDay)
            result = result.where('ReservationDateFormatted', '<', lastDay)
            totalCountResult = totalCountResult.where('ReservationDateFormatted', '>', firstDay)
            totalCountResult = totalCountResult.where('ReservationDateFormatted', '<', lastDay)
        }

        result = result.orderBy('ReservationDateFormatted', 'desc')
        
        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
        }
        
        const queryResult = await result.execute();
        const countResult = await totalCountResult.execute();
        if(!result){
            throw new Error('No sales found.')
        }

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        console.log('totalPages', totalPages)
        
        let filteredResult = queryResult

        // Filter to get unique ProjectName records (keeps first occurrence)
        if(filters && filters.isUnique  && filters.isUnique === true){
            const uniqueProjects = new Map();
            filteredResult = queryResult.filter(record => {
                if (!uniqueProjects.has(record.SalesTranCode)) {
                    uniqueProjects.set(record.SalesTranCode, true);
                    return true;
                }
                return false;
            })
        }
        
        return {
            success: true,
            data: {
                totalResults: totalCount,
                totalPages: totalPages,
                results: filteredResult
            }
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, results: VwSalesTrans[]},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getSalesTransDetails = async (salesTranId: number): QueryResult<VwSalesTransactions[]> => {
    try {
        const result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('SalesTranID', '=', salesTranId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .execute();

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

export const getPersonalSales = async (
    agentId: number, 
    filters?: { month?: number }, 
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalPages: number, results: VwSalesTransactions[]}> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')

        let totalCountResult = await db.selectFrom('Vw_SalesTransactions')
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.month){
            const year = new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
                    
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());
            
            result = result.where('ReservationDate', '>=', firstDay)
            result = result.where('ReservationDate', '<=', lastDay)
            totalCountResult = totalCountResult.where('ReservationDate', '>=', firstDay)
            totalCountResult = totalCountResult.where('ReservationDate', '<=', lastDay)
        }

        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
            totalCountResult = totalCountResult.offset(offset).fetch(pagination.pageSize)
        }
            
        const queryResult = await result.execute()
        const countResult = await totalCountResult.execute()

        
        if(!queryResult){
            throw new Error('No sales found.')
        }

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;


    
        return {
            success: true,
            data: {
                totalPages: totalPages,
                results: queryResult
            }
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalPages: number, results: VwSalesTransactions[]},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getTotalPersonalSales = async (agentId: number, filters?: { month?: number, year?: number}): QueryResult<number> => {
    try {
        let result = await db.selectFrom('Vw_SalesTransactions')
            .select(({fn, val, ref}) => [
                fn.sum(ref('NetTotalTCP')).as('TotalSales')
            ])
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.month){

            const year = new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
            
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());

            // const firstDay = new Date( filters.year ||(new Date).getFullYear(), filters.month - 1, 1)
            // const lastDay = new Date( filters.year ||(new Date).getFullYear(), filters.month, 1)

            result = result.where('ReservationDate', '>', firstDay)
            result = result.where('ReservationDate', '<', lastDay)
        }

        const queryResult = await result.execute()

        if(!queryResult){
            throw new Error('No sales found.')
        }

        return {
            success: true,
            data: Number(queryResult[0].TotalSales)
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

export const getTotalDivisionSales = async (divisionId: number, filters?: { month?: number, year?: number }): QueryResult<number> => {
    try {
        let result = await db.selectFrom('vw_SalesTrans')
                .select(({fn, val, ref}) => [
                    fn.sum(ref('NetTotalTCP')).as('TotalSales')
                ])
                .where('DivisionID', '=', divisionId)
                .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.month){

            const year = new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
            
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());

            // const firstDay = new Date( filters.year || (new Date).getFullYear(), filters.month - 1, 1)
            // const lastDay = new Date( filters.year || (new Date).getFullYear(), filters.month, 1)

             result = result
                .where(
                    sql`TRY_CONVERT(date, ${sql.ref('ReservationDate')}, 101)`,
                    '>=',
                    firstDay
                )
                .where(
                    sql`TRY_CONVERT(date, ${sql.ref('ReservationDate')}, 101)`,
                    '<',
                    lastDay
                )     
        }

        const queryResult = await result.execute()
    
        return {
            success: true,
            data: Number(queryResult[0].TotalSales)
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

export const getDivisionSales = async (
    divisionId: number, 
    filters?: {
        amount?: number,  
        agentId?: number, 
        isUnique?: boolean, 
        month?: number,
        year?: number,
    }, 
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{ totalPages: number, results: VwSalesTransactions[]}> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? (filters?.amount ?? undefined); // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('DivisionID', '=', divisionId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('AgentName', '<>', '')

        let totalCountResult = await db
            .selectFrom("Vw_SalesTransactions")
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where("DivisionID", "=", divisionId)
            .where("SalesStatus", "<>", "ARCHIVED")
            .where("AgentName", "<>", "")


        if(filters && filters.agentId){
            logger('getDivisionSales | Filtering by agentId', {agentId: filters.agentId})
            result = result.where('AgentID', '=', filters.agentId)
            totalCountResult = totalCountResult.where('AgentID', '=', filters.agentId)
        }

        if(filters && filters.month){

            const year = new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
            
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());

            // const firstDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month - 1, 1)
            // const lastDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month, 1)
            logger('getDivisionSales | Filtering by month', {firstDay, lastDay})
            result = result.where('DateFiled', '>', firstDay)
            result = result.where('DateFiled', '<', lastDay)
            totalCountResult = totalCountResult.where('DateFiled', '>', firstDay)
            totalCountResult = totalCountResult.where('DateFiled', '<', lastDay)
        }

        result = result.orderBy('DateFiled', 'desc')
        
        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
        }
        
        const queryResult = await result.execute();
        const countResult = await totalCountResult.execute();
        if(!result){
            throw new Error('No sales found.')
        }

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        console.log('totalPages', totalPages)
        
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
            data: {
                totalPages: totalPages,
                results: filteredResult
            }
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalPages: number, results: VwSalesTransactions[]},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

type SortOption = {
    field: 'Division' | 'CurrentMonth'
    direction: 'asc' | 'desc'
}

export const getDivisionSalesTotalsFn = async (sorts?: SortOption[], take?: number, date?: Date): QueryResult<FnDivisionSales[]> => {
    try {
        const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const result = await sql`
            SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} *
            FROM Fn_DivisionSales(${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
            ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
        `.execute(db)
        
        const rows: FnDivisionSales[] = result.rows as FnDivisionSales[]
        return {
            success: true,
            data: rows
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as FnDivisionSales[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

type SalesTargetSortOption = {
    field: 'DivisionName' | 'CurrentMonth'
    direction: 'asc' | 'desc'
}

export const getSalesTarget = async (sorts?: SalesTargetSortOption[], take?: number, date?: Date): QueryResult<VwDivisionSalesTarget[]> => {
    try {
        let base = await db.selectFrom('vw_DivisionSalesTarget')
            .selectAll()
            .where('DivisionName', 'is not', null)

        if(sorts && sorts.length > 0){
            sorts.forEach(sort => {
                base = base.orderBy(sql.ref(sort.field), sort.direction)
            })
        }

        if(take){
            base = base.limit(take)
        }

        const result = await base.execute() as VwDivisionSalesTarget[]

        return {
            success: true,
            data: result
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as VwDivisionSalesTarget[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getSalesTargetTotals = async (sorts?: SalesTargetSortOption[], take?: number, date?: Date): QueryResult<SalesTargetTotals> => {
    try {
        let base = await db.selectFrom('vw_DivisionSalesTarget')
            .select([
                ((eb) => eb.fn.sum(eb.ref('TargetMonth')).as('TotalTargetMonth')),
                ((eb) => eb.fn.sum(eb.ref('CurrentMonth')).as('TotalCurrentMonth')),
                sql<number>`
                    CASE 
                        WHEN SUM(TargetYear) = 0 OR SUM(CurrentYear) = 0 THEN 0
                        ELSE (SUM(CurrentYear) / SUM(TargetYear)) * 100 
                    END
                `.as('TotalReachPercent'),
            ])
            .where('DivisionName', 'is not', null)

        const result = await base.executeTakeFirstOrThrow()

        const obj = {
            TotalTargetMonth: Number(result.TotalTargetMonth),
            TotalCurrentMonth: Number(result.TotalCurrentMonth),
            TotalReachPercent: Number(result.TotalReachPercent)
        }

        return {
            success: true,
            data: obj
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as SalesTargetTotals,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

type DeveloperSalesSortOption = {
    field: 'DivisionName' | 'NetTotalTCP'
    direction: 'asc' | 'desc'
}


export const getSalesByDeveloperTotals = async (sorts?: DeveloperSalesSortOption[], take?: number, date?: Date): QueryResult<DeveloperSales[]> => {
    try {
       let base = await db.selectFrom('vw_SalesTrans')
            .select([
                'DeveloperName',
                (eb) => eb.fn.sum('NetTotalTCP').as('NetTotalTCP')
            ])
            .groupBy('DeveloperName')

        if(date){
            const month = date.getMonth() + 1

            base = base.where((eb) => eb.fn('MONTH', ['ReservationDate']), '=', month)
        }

        if(sorts && sorts.length > 0){
            sorts.forEach(sort => {
                base = base.orderBy(sql.ref(sort.field), sort.direction)
            })
        }

        if(take){
            base = base.limit(take)
        }

        const result = await base.execute()

        const format = result.map(item => {
            return {
                DeveloperName: item.DeveloperName || '',
                NetTotalTCP: item.NetTotalTCP ? Number(item.NetTotalTCP) : 0
            }
        })
            
        return {
            success: true,
            data: format
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as DeveloperSales[],
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

export const getPendingSales = async (
    divisionId?: number,
    filters?: {
        month?: number,
        year?: number,
        agentId?: number,
        createdBy?: number,
        developerId?: number,
        isUnique?: boolean,
        approvalStatus?: number[],
        salesBranch?: number
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalPages: number, results: AgentPendingSale[]}> => {
    try {
        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_PendingSalesTransactions')
            .selectAll()
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('ApprovalStatus', 'not in', [5])

        let totalCountResult = await db
            .selectFrom("Vw_PendingSalesTransactions")
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('ApprovalStatus', 'not in', [5])

        if(divisionId) {
            result = result.where('DivisionID', '=', divisionId)
            totalCountResult = totalCountResult.where('DivisionID', '=', divisionId)
        }

        if(filters && filters.developerId){
            result = result.where('DeveloperID', '=', filters.developerId)
            totalCountResult = totalCountResult.where('DeveloperID', '=', filters.developerId)
        }

        if(filters && filters.approvalStatus){
            result = result.where('ApprovalStatus', 'in', filters.approvalStatus)
            totalCountResult = totalCountResult.where('ApprovalStatus', 'in', filters.approvalStatus)
        }

        if(filters && filters.salesBranch){
            result = result.where('SalesBranchID', '=', filters.salesBranch)
            totalCountResult = totalCountResult.where('SalesBranchID', '=', filters.salesBranch)
        }

        if(filters && filters.agentId){
            result = result.where('CreatedBy', '=', filters.agentId)
            totalCountResult = totalCountResult.where('CreatedBy', '=', filters.agentId)
        }

        if(filters && filters.month){
            const year = new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
            
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());

            // const firstDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month - 1, 1)
            // const lastDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month, 1)
            result = result.where('ReservationDate', '>', firstDay)
            result = result.where('ReservationDate', '<', lastDay)
            totalCountResult = totalCountResult.where('ReservationDate', '>', firstDay)
            totalCountResult = totalCountResult.where('ReservationDate', '<', lastDay)
        }

        result = result.orderBy('ReservationDate', 'desc')
        
        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
        }
        
        const queryResult = await result.execute();
        const countResult = await totalCountResult.execute();
        if(!result){
            throw new Error('No sales found.')
        }

        

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        console.log('totalPages', totalPages)
        
        let filteredResult = queryResult

        // Filter to get unique ProjectName records (keeps first occurrence)
        if(filters && filters.isUnique  && filters.isUnique === true){
            const uniqueProjects = new Map();
            filteredResult = queryResult.filter(record => {
                if (!uniqueProjects.has(record.PendingSalesTranCode)) {
                    uniqueProjects.set(record.PendingSalesTranCode, true);
                    return true;
                }
                return false;
            })
        }
        
        return {
            success: true,
            data: {
                totalPages: totalPages,
                results: filteredResult
            }
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as {totalPages: number, results: AgentPendingSale[]},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getPendingSaleById = async (pendingSaleId: number): QueryResult<AgentPendingSalesWithDetails> => {
    try {
        const result = await db.selectFrom('Tbl_AgentPendingSales')
            .leftJoin('Tbl_Division', 'Tbl_AgentPendingSales.DivisionID', 'Tbl_Division.DivisionID')
            .leftJoin('Tbl_Projects', 'Tbl_AgentPendingSales.ProjectID', 'Tbl_Projects.ProjectID')
            .leftJoin('Tbl_ProjectType', 'Tbl_Projects.ProjectTypeID', 'Tbl_ProjectType.ProjectTypeID')
            .leftJoin('Tbl_SalesBranch', 'Tbl_AgentPendingSales.SalesBranchID', 'Tbl_SalesBranch.BranchID')
            .leftJoin('Tbl_Developers', 'Tbl_AgentPendingSales.DeveloperID', 'Tbl_Developers.DeveloperID')
            .leftJoin('Tbl_SalesSector', 'Tbl_AgentPendingSales.SalesSectorID', 'Tbl_SalesSector.SectorID')
            .select([
                'Tbl_AgentPendingSales.AgentPendingSalesID',
                'Tbl_AgentPendingSales.ApprovalStatus',
                'Tbl_AgentPendingSales.ApprovedSalesTranID',
                'Tbl_AgentPendingSales.Block',
                'Tbl_AgentPendingSales.BuyersAddress',
                'Tbl_AgentPendingSales.BuyersContactNumber',
                'Tbl_AgentPendingSales.BuyersName',
                'Tbl_AgentPendingSales.BuyersOccupation',
                'Tbl_AgentPendingSales.CommStatus',
                'Tbl_AgentPendingSales.CreatedBy',
                'Tbl_AgentPendingSales.DateFiled',
                'Tbl_AgentPendingSales.DevCommType',
                'Tbl_AgentPendingSales.DeveloperID',
                'Tbl_AgentPendingSales.DivisionID',
                'Tbl_AgentPendingSales.DownPayment',
                'Tbl_AgentPendingSales.DPStartSchedule',
                'Tbl_AgentPendingSales.DPTerms',
                'Tbl_AgentPendingSales.FinancingScheme',
                'Tbl_AgentPendingSales.FloorArea',
                'Tbl_AgentPendingSales.LastUpdate',
                'Tbl_AgentPendingSales.LastUpdateby',
                'Tbl_AgentPendingSales.Lot',
                'Tbl_AgentPendingSales.LotArea',
                'Tbl_AgentPendingSales.MiscFee',
                'Tbl_AgentPendingSales.MonthlyDP',
                'Tbl_AgentPendingSales.NetTotalTCP',
                'Tbl_AgentPendingSales.PendingSalesTranCode',
                'Tbl_AgentPendingSales.Phase',
                'Tbl_AgentPendingSales.ProjectID',
                'Tbl_AgentPendingSales.ProjectLocationID',
                'Tbl_AgentPendingSales.Remarks',
                'Tbl_AgentPendingSales.ReservationDate',
                'Tbl_AgentPendingSales.SalesBranchID',
                'Tbl_AgentPendingSales.SalesSectorID',
                'Tbl_AgentPendingSales.SalesStatus',
                'Tbl_AgentPendingSales.SellerName',
                // Add the names from joined tables
                'Tbl_Division.Division as DivisionName',
                'Tbl_Projects.ProjectName',
                'Tbl_SalesBranch.BranchName as SalesBranchName',
                'Tbl_Developers.DeveloperName',
                'Tbl_SalesSector.SectorName as SalesSectorName',
                'Tbl_ProjectType.ProjectTypeName'
            ])
            .where('Tbl_AgentPendingSales.AgentPendingSalesID', '=', pendingSaleId)
            .executeTakeFirstOrThrow()

        const details = await db.selectFrom('Tbl_AgentPendingSalesDtl')
            .selectAll()
            .where('PendingSalesTranCode', '=', result.PendingSalesTranCode)
            .execute()
        
        let imgs: IImageBase64[] = []

        const imageJunction = await db.selectFrom('Tbl_SalesTranImage')
            .selectAll()
            .where('PendingSalesTransID', '=', pendingSaleId)
            .execute()
        
        if(imageJunction && imageJunction.length > 0){
            const imageIds = imageJunction.map(img => img.ImageID)

            const images = await db.selectFrom('Tbl_Image')
                .selectAll()
                .where('ImageID', 'in', imageIds)
                .execute()
            
            if(images && images.length > 0){
                imgs = images.map(img => {

                    const fileName = img.Filename.toLowerCase()

                    return {
                        ImageID: img.ImageID,
                        FileName: img.Filename,
                        ContentType: img.ContentType,
                        FileExt: img.FileExtension,
                        FileSize: img.FileSize,
                        FileContent: img.FileContent.toString('base64'),
                        ImageType: fileName.includes('receipt') ? 'receipt' : fileName.includes('agreement') ? 'agreement' : 'other'
                    }
                })
            }
        }
        
        const obj = {
            ...result,
            DivisionName: result.DivisionName ? result.DivisionName.trim() : null,
            ProjectName: result.ProjectName ? result.ProjectName.trim() : null,
            SalesBranchName: result.SalesBranchName ? result.SalesBranchName.trim() : null,
            DeveloperName: result.DeveloperName ? result.DeveloperName.trim() : null,
            SalesSectorName: result.SalesSectorName ? result.SalesSectorName.trim() : null,
            ProjectTypeName: result.ProjectTypeName ? result.ProjectTypeName.trim() : null,
            Details: details,
            Images: imgs
        }

        return {
            success: true,
            data: obj
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as AgentPendingSalesWithDetails,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const addPendingSale = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    userRole: string,
    data: {
        reservationDate: Date,
        divisionID: number,
        salesBranchID: number,
        sectorID: number
        buyer: {
            buyersName: string,
            address: string,
            phoneNumber: string,
            occupation: string,
        },
        property: {
            projectID: number,
            blkFlr: string,
            lotUnit: string,
            phase: string,
            lotArea: number,
            flrArea: number,
            developerID: number,
            developerCommission: number,
            netTCP: number,
            miscFee: number,
            financingScheme: string,
        },
        payment: {
            downpayment: number,
            dpTerms: number,
            monthlyPayment: number
            dpStartDate: Date,
            sellerName: string,
        },
        images?: {
            receipt?: IImage,
            agreement?: IImage,
        },
        commissionRates?: {
            commissionRate: number,
            agentId?: number,
            agentName?: string,
            position: CommissionDetailPositions
        }[]
    }
): QueryResult<IAgentPendingSale> => {

    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'User not found',
                code: 400
            }
        }
    }

    if(user.agentUserId && user.webUserId){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'User role is required to add pending sale.',
                code: 400
            }
        }
    }



    const transactionNumber = await generateUniqueTranCode();

    const trx = await db.startTransaction().execute();

    try {

        if(userRole == ''){
            throw new Error('User role is required to add pending sale.')
        }

        const lookUpMap = new Map<string, {approvalStatus: number, statusText: string}>([
            ['SALES PERSON', {approvalStatus: 1, statusText: SalesStatusText.PENDING_UM}],
            ['UNIT MANAGER', {approvalStatus: 2, statusText: SalesStatusText.PENDING_SD}],
            ['SALES DIRECTOR', {approvalStatus: 3, statusText: SalesStatusText.PENDING_BH}],
            ['BRANCH SALES STAFF', {approvalStatus: 4, statusText: SalesStatusText.PENDING_SA}],
            ['SALES ADMIN', {approvalStatus: 5, statusText: SalesStatusText.APPROVED}]
        ])

        const {approvalStatus, statusText} = lookUpMap.get(userRole) || {approvalStatus: 1, statusText: SalesStatusText.PENDING_UM};

        // const approvalStatus = userRole === 'SALES PERSON' ? 1 : userRole === 'UNIT MANAGER' ? 2 : 3;
        // const statusText = userRole === 'SALES PERSON' ? SalesStatusText.PENDING_UM : userRole === 'UNIT MANAGER' ? SalesStatusText.PENDING_SD : SalesStatusText.PENDING_BH;

        const result = await trx.insertInto('Tbl_AgentPendingSales')
            .values({
                ReservationDate: data.reservationDate,
                DateFiled: new TZDate(new Date(), 'Asia/Manila'),
                DivisionID: data.divisionID,
                SalesBranchID: data.salesBranchID,
                SalesSectorID: data.sectorID,

                BuyersName: data.buyer.buyersName,
                BuyersAddress: data.buyer.address,
                BuyersContactNumber: data.buyer.phoneNumber,
                BuyersOccupation: data.buyer.occupation,

                ProjectID: data.property.projectID,
                Block: data.property.blkFlr,
                Lot: data.property.lotUnit,
                Phase: data.property.phase,
                LotArea: data.property.lotArea,
                FloorArea: data.property.flrArea,
                DeveloperID: data.property.developerID,
                DevCommType: data.property.developerCommission.toString(),
                NetTotalTCP: data.property.netTCP,
                MiscFee: data.property.miscFee,
                FinancingScheme: data.property.financingScheme,

                DownPayment: data.payment.downpayment,
                DPTerms: data.payment.dpTerms.toString(),
                MonthlyDP: data.payment.monthlyPayment,
                DPStartSchedule: data.payment.dpStartDate,
                CreatedBy: user.agentUserId ? user.agentUserId : user.webUserId || 0,
                SellerName: data.payment.sellerName,

                LastUpdateby: user.agentUserId || undefined,
                LastUpdateByWeb: user.webUserId || undefined,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),

                PendingSalesTranCode: transactionNumber,
                ApprovalStatus: approvalStatus,
                SalesStatus: statusText,
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        let receiptId = -1
        if(data.images?.receipt){
            const receiptResult = await trx.insertInto('Tbl_Image').values({
                Filename: `${result.PendingSalesTranCode}-receipt_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
                ContentType: data.images.receipt.ContentType,
                FileExtension: data.images.receipt.FileExt,
                FileSize: data.images.receipt.FileSize,
                FileContent: data.images.receipt.FileContent,
                CreatedAt: new Date()
            }).output('inserted.ImageID').executeTakeFirstOrThrow();

            receiptId = receiptResult.ImageID
        }

        let agreementId = -1
        if(data.images?.agreement){
            const agreementResult = await trx.insertInto('Tbl_Image').values({
                Filename: `${result.PendingSalesTranCode}-agreement_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
                ContentType: data.images.agreement.ContentType,
                FileExtension: data.images.agreement.FileExt,
                FileSize: data.images.agreement.FileSize,
                FileContent: data.images.agreement.FileContent,
                CreatedAt: new Date()
            }).output('inserted.ImageID').executeTakeFirstOrThrow();

            agreementId = agreementResult.ImageID
        }

        // commission details
        let commissionDetails: CommissionRateDetail = {};
        if(data.commissionRates && data.commissionRates.length > 0 && userRole !== 'SALES PERSON'){

            // fetch agent ids
            const agentIds = data.commissionRates
                .filter(c => c.agentId && c.agentId > 0)
                .map(c => c.agentId!) // non-null assertion since we filtered out undefined

            const agentData = new Map<number, VwAgents>();
            if(agentIds.length > 0){
                const agentsResult = await trx.selectFrom('Vw_Agents')
                    .selectAll()
                    .where('AgentID', 'in', agentIds)
                    .execute()
                
                agentsResult.forEach(agent => {
                    agentData.set(agent.AgentID || 0, agent)
                })
            }

            // broker
            const broker = data.commissionRates.find(c => c.position === CommissionDetailPositions.BROKER);
            if(broker){
                commissionDetails.broker = {
                    agentName: broker.agentName || '',
                    agentId: broker.agentId || 0,
                    commissionRate: broker.commissionRate || 0
                }
            }

            // sales director
            const salesDirector = data.commissionRates.find(c => c.position === CommissionDetailPositions.SALES_DIRECTOR);
            const sdAgent = salesDirector && salesDirector.agentId ? agentData.get(salesDirector.agentId) : null;
            if(salesDirector){
                commissionDetails.salesDirector = {
                    agentName: sdAgent ? `${sdAgent.LastName?.trim()}, ${sdAgent.FirstName?.trim()} ${sdAgent.MiddleName ? sdAgent.MiddleName.trim() : ''}` : (salesDirector.agentName || ''),
                    agentId: salesDirector.agentId || 0,
                    commissionRate: salesDirector.commissionRate || 0
                }
            }

            // unit manager
            const unitManager = data.commissionRates.find(c => c.position === CommissionDetailPositions.UNIT_MANAGER);
            const umAgent = unitManager && unitManager.agentId ? agentData.get(unitManager.agentId) : null;
            if(unitManager){
                commissionDetails.unitManager = {
                    agentName: umAgent ? `${umAgent.LastName?.trim()}, ${umAgent.FirstName?.trim()} ${umAgent.MiddleName ? umAgent.MiddleName.trim() : ''}` : (unitManager.agentName || ''),
                    agentId: unitManager.agentId || 0,
                    commissionRate: unitManager.commissionRate || 0
                }
            }

            // sales person
            const salesPerson = data.commissionRates.find(c => c.position === CommissionDetailPositions.SALES_PERSON);
            const spAgent = salesPerson && salesPerson.agentId ? agentData.get(salesPerson.agentId) : null;
            if(salesPerson){
                commissionDetails.salesPerson = {
                    agentName: spAgent ? `${spAgent.LastName?.trim()}, ${spAgent.FirstName?.trim()} ${spAgent.MiddleName ? spAgent.MiddleName.trim() : ''}` : (salesPerson.agentName || ''),
                    agentId: salesPerson.agentId || 0,
                    commissionRate: salesPerson.commissionRate || 0
                }
            }

            // sales associate
            const salesAssociate = data.commissionRates.find(c => c.position === CommissionDetailPositions.SALES_ASSOCIATE);
            const sAssocAgent = salesAssociate && salesAssociate.agentId ? agentData.get(salesAssociate.agentId) : null;
            if(salesAssociate){
                commissionDetails.salesAssociate = {
                    agentName: sAssocAgent ? `${sAssocAgent.LastName?.trim()}, ${sAssocAgent.FirstName?.trim()} ${sAssocAgent.MiddleName ? sAssocAgent.MiddleName.trim() : ''}` : (salesAssociate.agentName || ''),
                    agentId: salesAssociate.agentId || 0,
                    commissionRate: salesAssociate.commissionRate || 0
                }
            }

            // assistance fee
            const assistanceFee = data.commissionRates.find(c => c.position === CommissionDetailPositions.ASSISTANCE_FEE);
            const afAgent = assistanceFee && assistanceFee.agentId ? agentData.get(assistanceFee.agentId) : null;
            if(assistanceFee){
                commissionDetails.assistanceFee = {
                    agentName: afAgent ? `${afAgent.LastName?.trim()}, ${afAgent.FirstName?.trim()} ${afAgent.MiddleName ? afAgent.MiddleName.trim() : ''}` : (assistanceFee.agentName || ''),
                    agentId: assistanceFee.agentId || 0,
                    commissionRate: assistanceFee.commissionRate || 0
                }
            }

            // referral fee
            const referralFee = data.commissionRates.find(c => c.position === CommissionDetailPositions.REFERRAL_FEE);
            const rfAgent = referralFee && referralFee.agentId ? agentData.get(referralFee.agentId) : null;
            if(referralFee){
                commissionDetails.referralFee = {
                    agentName: rfAgent ? `${rfAgent.LastName?.trim()}, ${rfAgent.FirstName?.trim()} ${rfAgent.MiddleName ? rfAgent.MiddleName.trim() : ''}` : (referralFee.agentName || ''),
                    agentId: referralFee.agentId || 0,
                    commissionRate: referralFee.commissionRate || 0
                }
            }

            // others
            const others = data.commissionRates.find(c => c.position === CommissionDetailPositions.OTHERS);
            const oAgent = others && others.agentId ? agentData.get(others.agentId) : null;
            if(others){
                commissionDetails.others = {
                    agentName: oAgent ? `${oAgent.LastName?.trim()}, ${oAgent.FirstName?.trim()} ${oAgent.MiddleName ? oAgent.MiddleName.trim() : ''}` : (others.agentName || ''),
                    agentId: others.agentId || 0,
                    commissionRate: others.commissionRate || 0
                }
            }
        }

        const salesDetails = await trx.insertInto('Tbl_AgentPendingSalesDtl')
            .values([
                // Broker
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'BROKER',
                    PositionID: 76,
                    AgentName: commissionDetails.broker ? (commissionDetails.broker.agentName || '') : '',
                    AgentID: commissionDetails.broker ? (commissionDetails.broker.agentId || 0) : 0,
                    CommissionRate: commissionDetails.broker ? commissionDetails.broker.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Sales Director
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'SALES DIRECTOR',
                    PositionID: 85,
                    AgentName: commissionDetails.salesDirector ? (commissionDetails.salesDirector.agentName || '') : '',
                    AgentID: commissionDetails.salesDirector ? (commissionDetails.salesDirector.agentId || 0) : 0,
                    CommissionRate: commissionDetails.salesDirector ? commissionDetails.salesDirector.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Unit Manager
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'UNIT MANAGER',
                    PositionID: 86,
                    AgentName: commissionDetails.unitManager ? (commissionDetails.unitManager.agentName || '') : '',
                    AgentID: commissionDetails.unitManager ? (commissionDetails.unitManager.agentId || 0) : 0,
                    CommissionRate: commissionDetails.unitManager ? commissionDetails.unitManager.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Sales Person
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'SALES PERSON',
                    PositionID: 0,
                    AgentName: commissionDetails.salesPerson ? (commissionDetails.salesPerson.agentName || '') : '',
                    AgentID: commissionDetails.salesPerson ? (commissionDetails.salesPerson.agentId || 0) : 0,
                    CommissionRate: commissionDetails.salesPerson ? commissionDetails.salesPerson.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Sales Associate
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'SALES ASSOCIATE',
                    PositionID: 0,
                    AgentName: commissionDetails.salesAssociate ? (commissionDetails.salesAssociate.agentName || '') : '',
                    AgentID: commissionDetails.salesAssociate ? (commissionDetails.salesAssociate.agentId || 0) : 0,
                    CommissionRate: commissionDetails.salesAssociate ? commissionDetails.salesAssociate.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Assistance Fee
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'ASSISTANCE FEE',
                    PositionID: 0,
                    AgentName: commissionDetails.assistanceFee ? (commissionDetails.assistanceFee.agentName || '') : '',
                    AgentID: commissionDetails.assistanceFee ? (commissionDetails.assistanceFee.agentId || 0) : 0,
                    CommissionRate: commissionDetails.assistanceFee ? commissionDetails.assistanceFee.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Referral Fee
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'REFERRAL FEE',
                    PositionID: 0,
                    AgentName: commissionDetails.referralFee ? (commissionDetails.referralFee.agentName || '') : '',
                    AgentID: commissionDetails.referralFee ? (commissionDetails.referralFee.agentId || 0) : 0,
                    CommissionRate: commissionDetails.referralFee ? commissionDetails.referralFee.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Others
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'OTHERS',
                    PositionID: 0,
                    AgentName: commissionDetails.others ? (commissionDetails.others.agentName || '') : '',
                    AgentID: commissionDetails.others ? (commissionDetails.others.agentId || 0) : 0,
                    CommissionRate: commissionDetails.others ? commissionDetails.others.commissionRate : 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
            ])
            .outputAll('inserted')
            .execute()

        if(receiptId > 0){
            await trx.insertInto('Tbl_SalesTranImage').values({
                PendingSalesTransID: result.AgentPendingSalesID,
                TranCode: result.PendingSalesTranCode,
                ImageID: receiptId,
                ImageType: 'RECEIPT',
            }).execute()
        }

        if(agreementId > 0){
            await trx.insertInto('Tbl_SalesTranImage').values({
                PendingSalesTransID: result.AgentPendingSalesID,
                TranCode: result.PendingSalesTranCode,
                ImageID: agreementId,
                ImageType: 'AGREEMENT',
            }).execute()
        }
        
        await trx.commit().execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        await trx.rollback().execute();
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

// export const editPendingSale = async (

//     user: {
//         agentUserId?: number,
//         webUserId?: number
//     },
//     userRole: string,
//     data: {
//         pendingSalesId: number,
//         reservationDate?: Date,
//         divisionID?: number,
//         salesBranchID?: number,
//         sectorID?: number,
//         buyersName?: string,
//         address?: string,
//         phoneNumber?: string,
//         occupation?: string,
//         projectID?: number,
//         blkFlr?: string,
//         lotUnit?: string,
//         phase?: string,
//         lotArea?: number,
//         flrArea?: number,
//         developerID?: number,
//         developerCommission?: number,
//         netTCP?: number,
//         miscFee?: number,
//         financingScheme?: string,
//         downpayment?: number,
//         dpTerms?: number,
//         monthlyPayment?: number
//         dpStartDate?: Date,
//         sellerName?: string,
//         images?: {
//             receipt?: IImage,
//             agreement?: IImage,
//         },
//         commissionRates?: {
//             commissionRate: number,
//             agentId?: number,
//             agentName?: string,
//             position: CommissionDetailPositions
//         }[]
//     }
// ): QueryResult<any> => {
//     const trx = await db.startTransaction().execute();
//     try {

//         const result = await trx.updateTable('Tbl_AgentPendingSales')
//             .where('AgentPendingSalesID', '=', data.pendingSalesId)
//             .set({
//                 ReservationDate: data.reservationDate,
//                 DivisionID: data.divisionID,
//                 SalesBranchID: data.salesBranchID,
//                 BuyersName: data.buyersName,
//                 BuyersAddress: data.address,
//                 BuyersContactNumber: data.phoneNumber,
//                 BuyersOccupation: data.occupation,
//                 ProjectID: data.projectID,
//                 Block: data.blkFlr,
//                 Lot: data.lotUnit,
//                 Phase: data.phase,
//                 LotArea: data.lotArea,
//                 FloorArea: data.flrArea,
//                 DeveloperID: data.developerID,
//                 DevCommType: data.developerCommission?.toString(),
//                 NetTotalTCP: data.netTCP,
//                 MiscFee: data.miscFee,
//                 FinancingScheme: data.financingScheme,
//                 DownPayment: data.downpayment,
//                 DPTerms: data.dpTerms?.toString(),
//                 MonthlyDP: data.monthlyPayment,
//                 DPStartSchedule: data.dpStartDate,
//                 SellerName: data.sellerName,
//             }
//         )

//         if(data.images){
//            // copy the editSaleImage logic here?
//         }

//         return {
//             success: true,
//             data: result
//         }
//     }

//     catch(err: unknown){
//         await trx.rollback().execute();
//         const error = err as Error;
//         return {
//             success: false,
//             data: {} as IAgentPendingSale,
//             error: {
//                 code: 500,
//                 message: error.message
//             }
//         }
//     }
// }

export const editPendingSale = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    userRole: string,
    pendingSalesId: number,
    data: {
        reservationDate?: Date,
        divisionID?: number,
        salesBranchID?: number,
        sectorID?: number,
        buyersName?: string,
        address?: string,
        phoneNumber?: string,
        occupation?: string,
        projectID?: number,
        blkFlr?: string,
        lotUnit?: string,
        phase?: string,
        lotArea?: number,
        flrArea?: number,
        developerID?: number,
        developerCommission?: number,
        netTCP?: number,
        miscFee?: number,
        financingScheme?: string,
        downpayment?: number,
        dpTerms?: number,
        monthlyPayment?: number
        dpStartDate?: Date,
        sellerName?: string,
        images?: {
            receipt?: IImage,
            agreement?: IImage,
        },
        commissionRates?: {
            commissionRate: number,
            agentId?: number,
            agentName?: string,
            position: CommissionDetailPositions
        }[]
    }
): QueryResult<IAgentPendingSale> => {
    
    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'User not found',
                code: 400
            }
        }
    }

    const trx = await db.startTransaction().execute();
    
    try {
        // First, get the existing pending sale to retrieve the transaction code
        const existingSale = await trx.selectFrom('Tbl_AgentPendingSales')
            .selectAll()
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirst();

        if(!existingSale){
            throw new Error('Pending sale not found');
        }

        // Build update object dynamically - only include fields that are provided
        const updateData: any = {
            LastUpdateby: user.agentUserId || undefined,
            LastUpdateByWeb: user.webUserId || undefined,
            LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
        };

        if(data.reservationDate !== undefined) updateData.ReservationDate = data.reservationDate;
        if(data.divisionID !== undefined) updateData.DivisionID = data.divisionID;
        if(data.salesBranchID !== undefined) updateData.SalesBranchID = data.salesBranchID;
        if(data.sectorID !== undefined) updateData.SalesSectorID = data.sectorID;
        if(data.buyersName !== undefined) updateData.BuyersName = data.buyersName;
        if(data.address !== undefined) updateData.BuyersAddress = data.address;
        if(data.phoneNumber !== undefined) updateData.BuyersContactNumber = data.phoneNumber;
        if(data.occupation !== undefined) updateData.BuyersOccupation = data.occupation;
        if(data.projectID !== undefined) updateData.ProjectID = data.projectID;
        if(data.blkFlr !== undefined) updateData.Block = data.blkFlr;
        if(data.lotUnit !== undefined) updateData.Lot = data.lotUnit;
        if(data.phase !== undefined) updateData.Phase = data.phase;
        if(data.lotArea !== undefined) updateData.LotArea = data.lotArea;
        if(data.flrArea !== undefined) updateData.FloorArea = data.flrArea;
        if(data.developerID !== undefined) updateData.DeveloperID = data.developerID;
        if(data.developerCommission !== undefined) updateData.DevCommType = data.developerCommission.toString();
        if(data.netTCP !== undefined) updateData.NetTotalTCP = data.netTCP;
        if(data.miscFee !== undefined) updateData.MiscFee = data.miscFee;
        if(data.financingScheme !== undefined) updateData.FinancingScheme = data.financingScheme;
        if(data.downpayment !== undefined) updateData.DownPayment = data.downpayment;
        if(data.dpTerms !== undefined) updateData.DPTerms = data.dpTerms.toString();
        if(data.monthlyPayment !== undefined) updateData.MonthlyDP = data.monthlyPayment;
        if(data.dpStartDate !== undefined) updateData.DPStartSchedule = data.dpStartDate;
        if(data.sellerName !== undefined) updateData.SellerName = data.sellerName;

        // Update the pending sale
        console.log(data)
        console.log(updateData)
        const result = await trx.updateTable('Tbl_AgentPendingSales')
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        // Handle images if provided
        if(data.images && (data.images.receipt || data.images.agreement)){
            const existingImages = await trx.selectFrom('Tbl_SalesTranImage')
                .selectAll()
                .where('PendingSalesTransID', '=', pendingSalesId)
                .execute();

            const existingReceiptId = existingImages.find(img => img.ImageType.toLowerCase() === 'receipt')?.ImageID || -1;
            const existingAgreementId = existingImages.find(img => img.ImageType.toLowerCase() === 'agreement')?.ImageID || -1;

            // Handle receipt
            if(data.images.receipt){
                const newReceipt = await trx.insertInto('Tbl_Image')
                    .values({
                        Filename: `${existingSale.PendingSalesTranCode}-receipt_${format(new Date(), 'yyyy-MM-dd_hh:mmaa')}`.toLowerCase(),
                        ContentType: data.images.receipt.ContentType,
                        FileExtension: data.images.receipt.FileExt,
                        FileSize: data.images.receipt.FileSize,
                        FileContent: data.images.receipt.FileContent,
                        CreatedAt: new Date()
                    })
                    .output('inserted.ImageID')
                    .executeTakeFirstOrThrow();

                const newReceiptId = newReceipt.ImageID;

                await trx.insertInto('Tbl_SalesTranImage')
                    .values({
                        PendingSalesTransID: pendingSalesId,
                        TranCode: existingSale.PendingSalesTranCode,
                        ImageID: newReceiptId,
                        ImageType: 'RECEIPT'
                    })
                    .execute();

                // Delete old receipt if exists
                if(existingReceiptId > 0){
                    await trx.deleteFrom('Tbl_SalesTranImage')
                        .where('ImageID', '=', existingReceiptId)
                        .execute();
                    
                    await trx.deleteFrom('Tbl_Image')
                        .where('ImageID', '=', existingReceiptId)
                        .execute();
                }
            }

            // Handle agreement
            if(data.images.agreement){
                const newAgreement = await trx.insertInto('Tbl_Image')
                    .values({
                        Filename: `${existingSale.PendingSalesTranCode}-agreement_${format(new Date(), 'yyyy-MM-dd_hh:mmaa')}`.toLowerCase(),
                        ContentType: data.images.agreement.ContentType,
                        FileExtension: data.images.agreement.FileExt,
                        FileSize: data.images.agreement.FileSize,
                        FileContent: data.images.agreement.FileContent,
                        CreatedAt: new Date()
                    })
                    .output('inserted.ImageID')
                    .executeTakeFirstOrThrow();

                const newAgreementId = newAgreement.ImageID;

                await trx.insertInto('Tbl_SalesTranImage')
                    .values({
                        PendingSalesTransID: pendingSalesId,
                        TranCode: existingSale.PendingSalesTranCode,
                        ImageID: newAgreementId,
                        ImageType: 'AGREEMENT'
                    })
                    .execute();

                // Delete old agreement if exists
                if(existingAgreementId > 0){
                    await trx.deleteFrom('Tbl_SalesTranImage')
                        .where('ImageID', '=', existingAgreementId)
                        .execute();
                    
                    await trx.deleteFrom('Tbl_Image')
                        .where('ImageID', '=', existingAgreementId)
                        .execute();
                }
            }
        }

        // Handle commission rates if provided
        if(data.commissionRates && data.commissionRates.length > 0){
            // Fetch agent ids and data
            const agentIds = data.commissionRates
                .filter(c => c.agentId && c.agentId > 0)
                .map(c => c.agentId!);

            const agentData = new Map<number, VwAgents>();
            if(agentIds.length > 0){
                const agentsResult = await trx.selectFrom('Vw_Agents')
                    .selectAll()
                    .where('AgentID', 'in', agentIds)
                    .execute();
                
                agentsResult.forEach(agent => {
                    agentData.set(agent.AgentID || 0, agent);
                });
            }

            // Build commission details object
            let commissionDetails: CommissionRateDetail = {};

            const buildCommissionDetail = (position: CommissionDetailPositions): CommissionRate | undefined => {
                const commission = data.commissionRates!.find(c => c.position === position);

                if(!commission) {
                    return undefined
                };

                const agent = commission.agentId ? agentData.get(commission.agentId) : null;
                return {
                    agentName: agent 
                        ? `${agent.LastName?.trim()}, ${agent.FirstName?.trim()} ${agent.MiddleName ? agent.MiddleName.trim() : ''}`.trim()
                        : (commission.agentName || ''),
                    agentId: commission.agentId || 0,
                    commissionRate: commission.commissionRate || 0
                };
            };

            commissionDetails.broker = buildCommissionDetail(CommissionDetailPositions.BROKER);
            commissionDetails.salesDirector = buildCommissionDetail(CommissionDetailPositions.SALES_DIRECTOR);
            commissionDetails.unitManager = buildCommissionDetail(CommissionDetailPositions.UNIT_MANAGER);
            commissionDetails.salesPerson = buildCommissionDetail(CommissionDetailPositions.SALES_PERSON);
            commissionDetails.salesAssociate = buildCommissionDetail(CommissionDetailPositions.SALES_ASSOCIATE);
            commissionDetails.assistanceFee = buildCommissionDetail(CommissionDetailPositions.ASSISTANCE_FEE);
            commissionDetails.referralFee = buildCommissionDetail(CommissionDetailPositions.REFERRAL_FEE);
            commissionDetails.others = buildCommissionDetail(CommissionDetailPositions.OTHERS);

            // Update each commission detail row
            const updateCommission = async (positionName: string, positionID: number, detail: any) => {
                await trx.updateTable('Tbl_AgentPendingSalesDtl')
                    .where('PendingSalesTranCode', '=', existingSale.PendingSalesTranCode)
                    .where('PositionName', '=', positionName)
                    .set({
                        AgentName: detail ? (detail.agentName || '') : '',
                        AgentID: detail ? (detail.agentId || 0) : 0,
                        CommissionRate: detail ? detail.commissionRate : 0
                    })
                    .execute();
            };

            await updateCommission('BROKER', 76, commissionDetails.broker);
            await updateCommission('SALES DIRECTOR', 85, commissionDetails.salesDirector);
            await updateCommission('UNIT MANAGER', 86, commissionDetails.unitManager);
            await updateCommission('SALES PERSON', 0, commissionDetails.salesPerson);
            await updateCommission('SALES ASSOCIATE', 0, commissionDetails.salesAssociate);
            await updateCommission('ASSISTANCE FEE', 0, commissionDetails.assistanceFee);
            await updateCommission('REFERRAL FEE', 0, commissionDetails.referralFee);
            await updateCommission('OTHERS', 0, commissionDetails.others);
        }

        await trx.commit().execute();

        return {
            success: true,
            data: result
        };
    }
    catch(err: unknown){
        await trx.rollback().execute();
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

// UM Approval Step
export const editPendingSalesDetails = async (agentId: number, pendingSalesId: number, data?: EditPendingSaleDetail[]): QueryResult<any> => {

    if(!data || !data.length) {
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: 'No data provided.'
            }
        }
    };

   const providedAgentIds: number[] = data
        .map(d => d.agentId)
        .filter((id): id is number => id !== undefined);

    // Only fetch agents if we have agentIds to look up
    let agentMap = new Map<number, any>();

    if (providedAgentIds.length > 0) {
        const agents = await db.selectFrom('Vw_Agents')
            .selectAll()
            .where('AgentID', 'in', providedAgentIds)
            .execute();

        agentMap = new Map(
            agents
                .filter((agent): agent is typeof agent & { AgentID: number } => 
                    agent.AgentID !== null && agent.AgentID !== undefined
                )
                .map(agent => [agent.AgentID, agent])
        );

        // Check for missing agents only among the provided IDs
        const missingAgentIds = providedAgentIds.filter(id => !agentMap.has(id));

        if (missingAgentIds.length > 0) {
            logger('Agents not found', { missingAgentIds });
            return {
                success: false,
                data: [],
                error: {
                    code: 404,
                    message: `Agents not found: ${missingAgentIds.join(', ')}`
                }
            };
        }
    }

    const trx = await db.startTransaction().execute();

    try {
        const updatePromises = data.map(async (item) => {
            let agentName = ''
            if(item.agentId){
                const currentAgent = agentMap.get(item.agentId)!; 
                agentName = `${currentAgent.LastName.trim()}, ${currentAgent.FirstName.trim()} ${currentAgent.MiddleName ? currentAgent.MiddleName.trim() : ''}`
            }
            else if (item.agentName) {
                agentName = item.agentName
            }
        
            return trx.updateTable('Tbl_AgentPendingSalesDtl')
                .set({
                    ...(item.agentId && { AgentID: item.agentId }),
                    AgentName: agentName,
                    CommissionRate: item.commissionRate,
                })
                .where('AgentPendingSalesDtlID', '=', item.pendingSalesDtlId)
                .outputAll('inserted') // Note: 'inserted' might need to be 'updated' depending on your DB
                .executeTakeFirstOrThrow();
        });

        const resolvedPromises = await Promise.all(updatePromises);

        // update parent pending sale
        const updatePendingSale = await trx.updateTable('Tbl_AgentPendingSales')
            .set({
                LastUpdate: new Date(),
                LastUpdateby: agentId,
                ApprovalStatus: SaleStatus.UNIT_MANAGER_APPROVED,
                SalesStatus: SalesStatusText.PENDING_SD
            })
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirstOrThrow();

        await trx.commit().execute();

        return {
            success: true,
            data: resolvedPromises
        }
    }

    catch (err: unknown){
        await trx.rollback().execute();
        const error = err as Error;
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editSalesTransaction = async (
    userId: number,
    salesTranId: number,
    data: {
        reservationDate?: Date,
        divisionID?: number,
        salesBranchID?: number,
        sectorID?: number,
        buyersName?: string,
        address?: string,
        phoneNumber?: string,
        occupation?: string,
        projectID?: number,
        blkFlr?: string,
        lotUnit?: string,
        phase?: string,
        lotArea?: number,
        flrArea?: number,
        developerID?: number,
        developerCommission?: number,
        netTCP?: number,
        miscFee?: number,
        financingScheme?: string,
        downpayment?: number,
        dpTerms?: number,
        monthlyPayment?: number
        dpStartDate?: Date,
        sellerName?: string,
        images?: {
            receipt?: IImage,
            agreement?: IImage,
        },
        commissionRates?: {
            commissionRate: number,
            agentId?: number,
            agentName?: string,
            position: CommissionDetailPositions
        }[]
    }
): QueryResult<ITblSalesTrans> => {

    const trx = await db.startTransaction().execute();
    
    try {
        // First, get the existing pending sale to retrieve the transaction code
        // const existingSale = await trx.selectFrom('Tbl_AgentPendingSales')
        //     .selectAll()
        //     .where('AgentPendingSalesID', '=', pendingSalesId)
        //     .executeTakeFirst();

        const existingSale = await trx.selectFrom('Tbl_SalesTrans')
            .selectAll()
            .where('SalesTranID', '=', salesTranId)
            .executeTakeFirst();    

        if(!existingSale){
            throw new Error('Pending sale not found');
        }

        // Build update object dynamically - only include fields that are provided
        const updateData: any = {
            LastUpdateByWeb: userId || undefined,
            LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
        };

        if(data.reservationDate !== undefined) updateData.ReservationDate = data.reservationDate;
        if(data.divisionID !== undefined) updateData.DivisionID = data.divisionID;
        if(data.salesBranchID !== undefined) updateData.SalesBranchID = data.salesBranchID;
        if(data.sectorID !== undefined) updateData.SalesSectorID = data.sectorID;
        if(data.buyersName !== undefined) updateData.BuyersName = data.buyersName;
        if(data.address !== undefined) updateData.BuyersAddress = data.address;
        if(data.phoneNumber !== undefined) updateData.BuyersContactNumber = data.phoneNumber;
        if(data.occupation !== undefined) updateData.BuyersOccupation = data.occupation;
        if(data.projectID !== undefined) updateData.ProjectID = data.projectID;
        if(data.blkFlr !== undefined) updateData.Block = data.blkFlr;
        if(data.lotUnit !== undefined) updateData.Lot = data.lotUnit;
        if(data.phase !== undefined) updateData.Phase = data.phase;
        if(data.lotArea !== undefined) updateData.LotArea = data.lotArea;
        if(data.flrArea !== undefined) updateData.FloorArea = data.flrArea;
        if(data.developerID !== undefined) updateData.DeveloperID = data.developerID;
        if(data.developerCommission !== undefined) updateData.DevCommType = data.developerCommission.toString();
        if(data.netTCP !== undefined) updateData.NetTotalTCP = data.netTCP;
        if(data.miscFee !== undefined) updateData.MiscFee = data.miscFee;
        if(data.financingScheme !== undefined) updateData.FinancingScheme = data.financingScheme;
        if(data.downpayment !== undefined) updateData.DownPayment = data.downpayment;
        if(data.dpTerms !== undefined) updateData.DPTerms = data.dpTerms.toString();
        if(data.monthlyPayment !== undefined) updateData.MonthlyDP = data.monthlyPayment;
        if(data.dpStartDate !== undefined) updateData.DPStartSchedule = data.dpStartDate;
        if(data.sellerName !== undefined) updateData.SellerName = data.sellerName;

        // Update the pending sale
        console.log(data)
        console.log(updateData)
        const result = await trx.updateTable('Tbl_SalesTrans')
            .where('SalesTranID', '=', salesTranId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        // Handle images if provided
        if(data.images && (data.images.receipt || data.images.agreement)){
            const existingImages = await trx.selectFrom('Tbl_SalesTranImage')
                .selectAll()
                .where('SalesTransID', '=', salesTranId)
                .execute();

            const existingReceiptId = existingImages.find(img => img.ImageType.toLowerCase() === 'receipt')?.ImageID || -1;
            const existingAgreementId = existingImages.find(img => img.ImageType.toLowerCase() === 'agreement')?.ImageID || -1;

            // Handle receipt
            if(data.images.receipt){
                const newReceipt = await trx.insertInto('Tbl_Image')
                    .values({
                        Filename: `${existingSale.SalesTranCode}-receipt_${format(new Date(), 'yyyy-MM-dd_hh:mmaa')}`.toLowerCase(),
                        ContentType: data.images.receipt.ContentType,
                        FileExtension: data.images.receipt.FileExt,
                        FileSize: data.images.receipt.FileSize,
                        FileContent: data.images.receipt.FileContent,
                        CreatedAt: new Date()
                    })
                    .output('inserted.ImageID')
                    .executeTakeFirstOrThrow();

                const newReceiptId = newReceipt.ImageID;

                await trx.insertInto('Tbl_SalesTranImage')
                    .values({
                        PendingSalesTransID: existingImages[0].PendingSalesTransID,
                        SalesTransID: salesTranId,
                        TranCode: existingSale.SalesTranCode,
                        ImageID: newReceiptId,
                        ImageType: 'RECEIPT'
                    })
                    .execute();

                // Delete old receipt if exists
                if(existingReceiptId > 0){
                    await trx.deleteFrom('Tbl_SalesTranImage')
                        .where('ImageID', '=', existingReceiptId)
                        .execute();
                    
                    await trx.deleteFrom('Tbl_Image')
                        .where('ImageID', '=', existingReceiptId)
                        .execute();
                }
            }

            // Handle agreement
            if(data.images.agreement){
                const newAgreement = await trx.insertInto('Tbl_Image')
                    .values({
                        Filename: `${existingSale.SalesTranCode}-agreement_${format(new Date(), 'yyyy-MM-dd_hh:mmaa')}`.toLowerCase(),
                        ContentType: data.images.agreement.ContentType,
                        FileExtension: data.images.agreement.FileExt,
                        FileSize: data.images.agreement.FileSize,
                        FileContent: data.images.agreement.FileContent,
                        CreatedAt: new Date()
                    })
                    .output('inserted.ImageID')
                    .executeTakeFirstOrThrow();

                const newAgreementId = newAgreement.ImageID;

                await trx.insertInto('Tbl_SalesTranImage')
                    .values({
                        PendingSalesTransID: existingImages[0].PendingSalesTransID,
                        TranCode: existingSale.SalesTranCode,
                        ImageID: newAgreementId,
                        ImageType: 'AGREEMENT'
                    })
                    .execute();

                // Delete old agreement if exists
                if(existingAgreementId > 0){
                    await trx.deleteFrom('Tbl_SalesTranImage')
                        .where('ImageID', '=', existingAgreementId)
                        .execute();
                    
                    await trx.deleteFrom('Tbl_Image')
                        .where('ImageID', '=', existingAgreementId)
                        .execute();
                }
            }
        }

        // Handle commission rates if provided
        if(data.commissionRates && data.commissionRates.length > 0){
            // Fetch agent ids and data
            const agentIds = data.commissionRates
                .filter(c => c.agentId && c.agentId > 0)
                .map(c => c.agentId!);

            const agentData = new Map<number, VwAgents>();
            if(agentIds.length > 0){
                const agentsResult = await trx.selectFrom('Vw_Agents')
                    .selectAll()
                    .where('AgentID', 'in', agentIds)
                    .execute();
                
                agentsResult.forEach(agent => {
                    agentData.set(agent.AgentID || 0, agent);
                });
            }

            // Build commission details object
            let commissionDetails: CommissionRateDetail = {};

            const buildCommissionDetail = (position: CommissionDetailPositions): CommissionRate | undefined => {
                const commission = data.commissionRates!.find(c => c.position === position);

                if(!commission) {
                    return undefined
                };

                const agent = commission.agentId ? agentData.get(commission.agentId) : null;
                return {
                    agentName: agent 
                        ? `${agent.LastName?.trim()}, ${agent.FirstName?.trim()} ${agent.MiddleName ? agent.MiddleName.trim() : ''}`.trim()
                        : (commission.agentName || ''),
                    agentId: commission.agentId || 0,
                    commissionRate: commission.commissionRate || 0
                };
            };

            commissionDetails.broker = buildCommissionDetail(CommissionDetailPositions.BROKER);
            commissionDetails.salesDirector = buildCommissionDetail(CommissionDetailPositions.SALES_DIRECTOR);
            commissionDetails.unitManager = buildCommissionDetail(CommissionDetailPositions.UNIT_MANAGER);
            commissionDetails.salesPerson = buildCommissionDetail(CommissionDetailPositions.SALES_PERSON);
            commissionDetails.salesAssociate = buildCommissionDetail(CommissionDetailPositions.SALES_ASSOCIATE);
            commissionDetails.assistanceFee = buildCommissionDetail(CommissionDetailPositions.ASSISTANCE_FEE);
            commissionDetails.referralFee = buildCommissionDetail(CommissionDetailPositions.REFERRAL_FEE);
            commissionDetails.others = buildCommissionDetail(CommissionDetailPositions.OTHERS);

            // Update each commission detail row
            const updateCommission = async (positionName: string, positionID: number, detail: any) => {
                await trx.updateTable('Tbl_SalesTransDtl')
                    .where('SalesTranCode', '=', existingSale.SalesTranCode)
                    .where('PositionName', '=', positionName)
                    .set({
                        AgentName: detail ? (detail.agentName || '') : '',
                        AgentID: detail ? (detail.agentId || 0) : 0,
                        CommissionRate: detail ? detail.commissionRate : 0
                    })
                    .execute();
            };

            await updateCommission('BROKER', 76, commissionDetails.broker);
            await updateCommission('SALES DIRECTOR', 85, commissionDetails.salesDirector);
            await updateCommission('UNIT MANAGER', 86, commissionDetails.unitManager);
            await updateCommission('SALES PERSON', 0, commissionDetails.salesPerson);
            await updateCommission('SALES ASSOCIATE', 0, commissionDetails.salesAssociate);
            await updateCommission('ASSISTANCE FEE', 0, commissionDetails.assistanceFee);
            await updateCommission('REFERRAL FEE', 0, commissionDetails.referralFee);
            await updateCommission('OTHERS', 0, commissionDetails.others);
        }

        await trx.commit().execute();

        const obj: ITblSalesTrans = {
            ...result,
            SalesTranID: existingSale.SalesTranID,

        }

        return {
            success: true,
            data: result
        };
    }
    catch(err: unknown){
        await trx.rollback().execute();
        const error = err as Error;
        return {
            success: false,
            data: {} as ITblSalesTrans ,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const approveNextStage = async (data: {
        agentId?: number,
        userId?: number,
        pendingSalesId: number,
        nextApprovalStatus: number,
        nextSalesStatus: string
    }
): QueryResult<IAgentPendingSale> => {
    try {
        const result = await db.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovalStatus: data.nextApprovalStatus,
                SalesStatus: data.nextSalesStatus,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: data.agentId || undefined,
                LastUpdateByWeb:  data.userId || undefined
            })
            .where('AgentPendingSalesID', '=', data.pendingSalesId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()
        
        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const rejectPendingSale = async (agentId: number, pendingSalesId: number, approvalStatus: number, salesStatus: string): QueryResult<any> => {

    if(agentId == 0){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    try {
        const result = await db.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovalStatus: approvalStatus || 0,
                SalesStatus: salesStatus || 'REJECTED',
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: agentId
            })
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const approvePendingSaleTransaction = async (userWebId: number, pendingSalesId: number): QueryResult<any> => {

    const trx = await db.startTransaction().execute()
    try {
        // update pending sale to approved
        const updatedPendingSale = await trx.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovalStatus: SaleStatus.SALES_ADMIN_APPROVED,
                SalesStatus: SalesStatusText.APPROVED,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: userWebId
            })
            .outputAll('inserted')
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirstOrThrow()

        // fetch pending sales details
        const pendingSalesDetails = await trx.selectFrom('Tbl_AgentPendingSalesDtl')
            .selectAll()
            .where('PendingSalesTranCode', '=', updatedPendingSale.PendingSalesTranCode)
            .execute()

        // create new row in sales trans
        const newSalesTrans = await trx.insertInto('Tbl_SalesTrans')
            .values({
                Block: updatedPendingSale.Block,
                BuyersAddress: updatedPendingSale.BuyersAddress || '',
                BuyersContactNumber: updatedPendingSale.BuyersContactNumber || '',
                BuyersName: updatedPendingSale.BuyersName || '',
                BuyersOccupation: updatedPendingSale.BuyersOccupation || '',
                CommStatus: updatedPendingSale.CommStatus || '',
                DateFiled: updatedPendingSale.DateFiled || null,
                DevCommType: updatedPendingSale.DevCommType,
                DeveloperID: updatedPendingSale.DeveloperID || null,
                DivisionID: updatedPendingSale.DivisionID || null,
                DownPayment: updatedPendingSale.DownPayment,
                DPStartSchedule: updatedPendingSale.DPStartSchedule || null,
                DPTerms: updatedPendingSale.DPTerms,
                FinancingScheme: updatedPendingSale.FinancingScheme,
                FloorArea: updatedPendingSale.FloorArea,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: userWebId,
                Lot: updatedPendingSale.Lot,
                LotArea: updatedPendingSale.LotArea,
                MiscFee: updatedPendingSale.MiscFee,
                MonthlyDP: updatedPendingSale.MonthlyDP,
                NetTotalTCP: updatedPendingSale.NetTotalTCP,
                Phase: updatedPendingSale.Phase,
                ProjectID: updatedPendingSale.ProjectID || null,
                ProjectLocationID: updatedPendingSale.ProjectLocationID || null,
                ReservationDate: updatedPendingSale.ReservationDate,
                SalesBranchID: updatedPendingSale.SalesBranchID || null,
                SalesSectorID: updatedPendingSale.SalesSectorID,
                SalesStatus: SalesStatusText.NEW,
                SalesTranCode: updatedPendingSale.PendingSalesTranCode,
                SellerName: updatedPendingSale.SellerName || '',
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        // transfer pending sales dtl to sales dtl
        const insertSalesDtl = await trx.insertInto('Tbl_SalesTransDtl')
            .values(pendingSalesDetails.map(dtl => ({
                SalesTranCode: newSalesTrans.SalesTranCode,
                AgentID: dtl.AgentID,
                AgentName: dtl.AgentName,
                Commission: dtl.Commission,
                CommissionRate: dtl.CommissionRate,
                PositionID: dtl.PositionID,
                PositionName: dtl.PositionName,
                VATRate: dtl.VATRate,
                WTaxRate: dtl.WTaxRate
            })))
            .outputAll('inserted')
            .execute()

        // update pending sale link ID
        const linkPendingSale = await trx.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovedSalesTranID: newSalesTrans.SalesTranID
            })
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirstOrThrow()

        const saleImages = await trx.selectFrom('Tbl_SalesTranImage')
            .selectAll()
            .where('PendingSalesTransID', '=', pendingSalesId)
            .execute()
        
        if(saleImages && saleImages.length > 0){
            const linkSaleImage = await trx.updateTable('Tbl_SalesTranImage')
                .set({
                    TranCode: newSalesTrans.SalesTranCode,
                    SalesTransID: newSalesTrans.SalesTranID
                })
                .where('PendingSalesTransID', '=', pendingSalesId)
                .executeTakeFirstOrThrow()
        }

        await trx.commit().execute();

        return {
            success: true,
            data: newSalesTrans
        }
    }

    catch(err: unknown){
        await trx.rollback().execute()

        const error = err as Error
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getSaleImagesByTransactionDetail = async (salesTransDtlId: number): QueryResult<IImageBase64[]> => {
    try {
        const transaction = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('SalesTransDtlID', '=', salesTransDtlId)
            .executeTakeFirst()

        if(!transaction){
            return {
                success: false,
                data: [],
                error: {
                    code: 404,
                    message: 'Sales transaction detail not found.'
                }
            }
        }

        const imageJunction = await db.selectFrom('Tbl_SalesTranImage')
            .selectAll()
            .where('SalesTransID', '=', transaction.SalesTranID)
            .execute()
        
        if(!imageJunction || imageJunction.length === 0){
            return {
                success: true,
                data: []
            }
        }

        const imageIds = imageJunction.map(imgJunc => imgJunc.ImageID)

        const images = await db.selectFrom('Tbl_Image')
            .selectAll()
            .where('ImageID', 'in', imageIds)
            .execute()

        const obj: IImageBase64[] = images.map(img => {

            const fileName = img.Filename.toLowerCase()
            return {
                ImageID: img.ImageID,
                FileName: img.Filename,
                ContentType: img.ContentType,
                FileExt: img.FileExtension,
                FileSize: img.FileSize,
                FileContent: img.FileContent.toString('base64'),
                ImageType: fileName.includes('receipt') ? 'receipt' : fileName.includes('agreement') ? 'agreement' : 'other'

            }    
        })
        
        return {
            success: true,
            data: obj
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editSaleImages = async (pendingSaleId?: number, transSaleId?: number, receipt?: IImage, agreement?: IImage, pendingTranCode?: string): QueryResult<{newReceiptId: number | null, newAgreementId: number | null}> => {
    const trx = await db.startTransaction().execute();
    try {

        if(!pendingSaleId && !transSaleId){
            return {
                success: false,
                data: {} as {newReceiptId: number, newAgreementId: number},
                error: {
                    code: 400,
                    message: 'Pending sale id or transaction sale id is required.'
                }
            }
        }

        if(!receipt && !agreement){
            return {
                success: false,
                data: {} as {newReceiptId: number, newAgreementId: number},
                error: {
                    code: 400,
                    message: 'Receipt or agreement is required.'
                }
            }
        }

        let existingReceiptId: number = -1
        let existingAgreementId: number = -1
        let newReceiptId: number = -1
        let newAgreementId: number = -1

        let existingImages = await db.selectFrom('Tbl_SalesTranImage')
            .selectAll()

        console.log('pendingSaleId: ', pendingSaleId, 'transSaleId: ', transSaleId)
        
        if(pendingSaleId !== undefined && pendingSaleId !== null){
            existingImages = existingImages
                .where('PendingSalesTransID', '=', pendingSaleId)
        }

        if(transSaleId !== undefined && transSaleId !== null){
            existingImages = existingImages
                .where('SalesTransID', '=', transSaleId)
        }

        const images = await existingImages.execute()

        if(images && images.length > 0){
            existingReceiptId = images.find(img => img.ImageType.toLowerCase() === 'receipt')?.ImageID || -1
            existingAgreementId = images.find(img => img.ImageType.toLowerCase() === 'agreement')?.ImageID || -1
        }

        // upload images
        if(receipt){
            const newReceipt = await trx.insertInto('Tbl_Image')
                .values({
                    Filename: pendingTranCode ? `${pendingTranCode}-receipt_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase() : receipt?.FileName,
                    ContentType: receipt?.ContentType,
                    FileExtension: receipt?.FileExt,
                    FileSize: receipt?.FileSize,
                    FileContent: receipt?.FileContent,
                    CreatedAt: new Date()
                })
                .outputAll('inserted')
                .executeTakeFirstOrThrow()
            
            newReceiptId = newReceipt.ImageID
        }

        if(agreement){
            const newAgreement = await trx.insertInto('Tbl_Image')
                .values({
                    Filename: pendingTranCode ? `${pendingTranCode}-agreement_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase() : agreement.FileName,
                    ContentType: agreement?.ContentType,
                    FileExtension: agreement?.FileExt,
                    FileSize: agreement?.FileSize,
                    FileContent: agreement?.FileContent,
                    CreatedAt: new Date()
                })
                .outputAll('inserted')
                .executeTakeFirstOrThrow()
            
            newAgreementId = newAgreement.ImageID
        }

        // create new junction rows
        if(newReceiptId > 0){
            await trx.insertInto('Tbl_SalesTranImage')
                .values({
                    PendingSalesTransID: pendingSaleId ? pendingSaleId : 0,
                    SalesTransID: transSaleId ? transSaleId : null,
                    ImageID: newReceiptId,
                    ImageType: 'RECEIPT'
                })
                .execute()
        }

        if(newAgreementId > 0){
            await trx.insertInto('Tbl_SalesTranImage')
                .values({
                    PendingSalesTransID: pendingSaleId ? pendingSaleId : 0,
                    SalesTransID: transSaleId ? transSaleId : null,
                    ImageID: newAgreementId,
                    ImageType: 'AGREEMENT'
                })
                .execute()
        }

        console.log('existingReceiptId: ', existingReceiptId, 'existingAgreementId: ', existingAgreementId, 'newReceiptId: ', newReceiptId, 'newAgreementId: ', newAgreementId)

        // delete old images
        if( receipt && existingReceiptId > 0 && existingReceiptId !== newReceiptId){
            console.log('existingReceiptId: ', existingReceiptId, 'newReceiptId: ', newReceiptId, "deleting receipt")
            
            await trx.deleteFrom('Tbl_SalesTranImage')
                .where('ImageID', '=', existingReceiptId)
                .execute()

            await trx.deleteFrom('Tbl_Image')
                .where('ImageID', '=', existingReceiptId)
                .execute()
        }

        if( agreement && existingAgreementId > 0 && existingAgreementId !== newAgreementId){
            console.log('existingAgreementId: ', existingAgreementId, 'newAgreementId: ', newAgreementId, "deleting agreement")

            await trx.deleteFrom('Tbl_SalesTranImage')
                .where('ImageID', '=', existingAgreementId)
                .execute()

            await trx.deleteFrom('Tbl_Image')
                .where('ImageID', '=', existingAgreementId)
                .execute()
        }

        await trx.commit().execute()

        return {
            success: true,
            data: {
                newReceiptId: newReceiptId > 0 ? newReceiptId : 0, 
                newAgreementId: newAgreementId > 0 ? newAgreementId : 0
            },
        }
    }

    catch(err: unknown){
        await trx.rollback().execute()
        const error = err as Error
        return {
            success: false,
            data: {} as {newReceiptId: number, newAgreementId: number},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}