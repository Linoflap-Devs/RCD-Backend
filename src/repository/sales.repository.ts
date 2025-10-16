import { endOfDay, format, startOfDay } from "date-fns";
import { db } from "../db/db"
import { TblAgentPendingSalesDtl, TblSalesBranch, TblSalesSector, VwDivisionSalesTarget, VwSalesTrans, VwSalesTransactions } from "../db/db-types"
import { QueryResult } from "../types/global.types"
import { logger } from "../utils/logger"
import { AgentPendingSale, AgentPendingSalesDetail, AgentPendingSalesWithDetails, DeveloperSales, EditPendingSaleDetail, FnDivisionSales, FnSalesTarget, SalesTargetTotals } from "../types/sales.types";
import { TZDate } from "@date-fns/tz";
import { sql } from "kysely";

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
        isUnique?: boolean
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
            .where('ApprovalStatus', 'not in', [3])

        let totalCountResult = await db
            .selectFrom("Vw_PendingSalesTransactions")
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('ApprovalStatus', 'not in', [3])

        if(divisionId) {
            result = result.where('DivisionID', '=', divisionId)
            totalCountResult = totalCountResult.where('DivisionID', '=', divisionId)
        }

        if(filters && filters.developerId){
            result = result.where('DeveloperID', '=', filters.developerId)
            totalCountResult = totalCountResult.where('DeveloperID', '=', filters.developerId)
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

        const obj = {
            ...result,
            DivisionName: result.DivisionName ? result.DivisionName.trim() : null,
            ProjectName: result.ProjectName ? result.ProjectName.trim() : null,
            SalesBranchName: result.SalesBranchName ? result.SalesBranchName.trim() : null,
            DeveloperName: result.DeveloperName ? result.DeveloperName.trim() : null,
            SalesSectorName: result.SalesSectorName ? result.SalesSectorName.trim() : null,
            ProjectTypeName: result.ProjectTypeName ? result.ProjectTypeName.trim() : null,
            Details: details
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
    userId: number,
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
        
    }
): QueryResult<any> => {

    const transactionNumber = await generateUniqueTranCode();

    const trx = await db.startTransaction().execute();

    try {
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
                CreatedBy: userId,
                SellerName: data.payment.sellerName,

                LastUpdateby: userId,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),

                PendingSalesTranCode: transactionNumber,
                ApprovalStatus: 1,
                SalesStatus: 'PENDING APPROVAL - UNIT MANAGER'
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        const salesDetails = await trx.insertInto('Tbl_AgentPendingSalesDtl')
            .values([
                // Broker
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'BROKER',
                    PositionID: 76,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Sales Director
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'SALES DIRECTOR',
                    PositionID: 85,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Unit Manager
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'UNIT MANAGER',
                    PositionID: 86,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Sales Person
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'SALES PERSON',
                    PositionID: 0,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Sales Associate
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'SALES ASSOCIATE',
                    PositionID: 0,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Assistance Fee
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'ASSISTANCE FEE',
                    PositionID: 0,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Referral Fee
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'REFERRAL FEE',
                    PositionID: 0,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
                // Others
                {
                    PendingSalesTranCode: result.PendingSalesTranCode,
                    PositionName: 'OTHERS',
                    PositionID: 0,
                    AgentName: '',
                    AgentID: 0,
                    CommissionRate: 0,
                    WTaxRate: 0,
                    VATRate: 0,
                    Commission: 0
                },
            ])
            .outputAll('inserted')
            .execute()
        
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
            data: {},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

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

        // for(const agent of data){

        //     const currentAgent = agents.find(a => a.AgentID === agent.agentId);

        //     if(!currentAgent){
        //         logger('Agent not found.', {agentId: agent.agentId})
        //         continue
        //     }

        //     const updateOperation = await trx.updateTable('Tbl_AgentPendingSalesDtl')
        //                                     .set({
        //                                         AgentID: agent.agentId,
        //                                         AgentName: `${currentAgent.LastName}, ${currentAgent.FirstName} ${currentAgent.MiddleName ? currentAgent.MiddleName : ''}`,
        //                                         CommissionRate: agent.commissionRate,
        //                                     })
        //                                     .where('AgentPendingSalesDtlID', '=', agent.pendingSalesDtlId)
        //                                     .outputAll('inserted')
        //                                     .executeTakeFirstOrThrow();

        //     updatedArr.push(updateOperation);
        // }

        const resolvedPromises = await Promise.all(updatePromises);

        // update parent pending sale
        const updatePendingSale = await trx.updateTable('Tbl_AgentPendingSales')
            .set({
                LastUpdate: new Date(),
                LastUpdateby: agentId,
                ApprovalStatus: 2,
                SalesStatus: 'PENDING APPROVAL - SALES DIRECTOR'
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

export const rejectPendingSale = async (agentId: number, pendingSalesId: number): QueryResult<any> => {
    try {
        const result = await db.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovalStatus: 0,
                SalesStatus: 'REJECTED',
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

export const approvePendingSaleTransaction = async (agentId: number, pendingSalesId: number): QueryResult<any> => {

    const trx = await db.startTransaction().execute()
    try {
        // update pending sale to approved
        const updatedPendingSale = await trx.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovalStatus: 3,
                SalesStatus: 'APPROVED',
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: agentId
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
                LastUpdateby: agentId,
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
                SalesStatus: updatedPendingSale.SalesStatus,
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