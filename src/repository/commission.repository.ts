import { endOfDay, setHours, startOfDay } from "date-fns"
import { db } from "../db/db"
import { VwCommissionReleaseDeductionReport } from "../db/db-types"
import { QueryResult } from "../types/global.types"
import { logger } from "../utils/logger"
import { TZDate } from '@date-fns/tz'
import { FnCommissionForecast, FnCommissionForecastByMonth, FnCommissionForecastPercentage, FnCommissionForecastTopBuyer } from "../types/commission.types"
import { sql } from "kysely"

export const getCommissions = async (
    filters?: { 
        agentId?: number, 
        month?: number,
        year?: number 
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
            const firstDay = new Date( filters.year || (new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date( filters.year || (new Date).getFullYear(), filters.month, 1)
            result = result.where('CommReleaseDate', '>', firstDay)
            result = result.where('CommReleaseDate', '<', lastDay)
            totalCount = totalCount.where('CommReleaseDate', '>', firstDay)
            totalCount = totalCount.where('CommReleaseDate', '<', lastDay)
        }

        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
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

export const getTotalAgentCommissions = async (agentId: number, filters?: { month?: number, year?: number }): QueryResult<number> => {
    try {
        let result = await db.selectFrom('Vw_CommissionReleaseDeductionReport')
            .select(({fn, val, ref}) => [
                fn.sum(ref('ReleasedAmount')).as('TotalCommission')
            ])
            .where('AgentID', '=', agentId)

        if(filters?.month){
            const firstDay = new Date(filters.year || (new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date(filters.year || (new Date).getFullYear(), filters.month, 1)
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

export const getAgentCommissionDetails = async (agentId: number, date?: Date): QueryResult<VwCommissionReleaseDeductionReport[]> => {
    logger('getAgentCommissionDetails', { agentId, date })
    try {

        let query = await db.selectFrom('Vw_CommissionReleaseDeductionReport')
            .where('AgentID', '=', agentId)
            .selectAll()

        if(date){
            const philippineDate = new TZDate(date, 'Asia/Manila')
            
            const philippineDayStart = startOfDay(philippineDate)
            const philippineDayEnd = endOfDay(philippineDate)
            
            const dayStart = new Date(philippineDayStart.getTime())
            const dayEnd = new Date(philippineDayEnd.getTime())

            logger('getAgentCommissionDetails dayStart dayEnd', { dayStart, dayEnd })

            query = query.where('CommReleaseDate', '>', dayStart)
            query = query.where('CommReleaseDate', '<', dayEnd)
        }

        const result = await query.execute()

        if(!result){
            throw new Error('No commission found.');
        }

        return {
            success: true,
            data: result
        }
        
    }
    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as VwCommissionReleaseDeductionReport[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

type SortOption = {
    field: 'ReservationDate'
    direction: 'asc' | 'desc'
}

export const getCommissionForecastFn = async (sorts?: SortOption[], take?: number, date?: Date): QueryResult<FnCommissionForecast[]> => {
    try {
        const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const result = await sql`
            SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} *
            FROM Fn_CommissionForecast( ${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
            ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
        `.execute(db)
        
        const rows: FnCommissionForecast[] = result.rows as FnCommissionForecast[]
        return {
            success: true,
            data: rows
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as FnCommissionForecast[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

type TopBuyerSortOption = {
    field: 'NetTotalTCP'
    direction: 'asc' | 'desc'
}

export const getCommissionForecastTopBuyersFn = async (sorts?: TopBuyerSortOption[], take?: number, date?: Date): QueryResult<FnCommissionForecastTopBuyer[]> => {
    try {
        const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const result = await sql`
            SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} BuyersName, SUM(NetTotalTCP) AS NetTotalTCP
            FROM Fn_CommissionForecast( ${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
            GROUP BY BuyersName
            ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
        `.execute(db)
        
        const rows: FnCommissionForecastTopBuyer[] = result.rows as FnCommissionForecastTopBuyer[]
        return {
            success: true,
            data: rows
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as FnCommissionForecastTopBuyer[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

type ForecastByMonthSortOption = {
    field: 'NetTotalTCP' | 'Month' | 'Year'
    direction: 'asc' | 'desc'
}

export const getCommissionForecastByMonthFn = async (sorts?: ForecastByMonthSortOption[], take?: number, date?: Date, year: number = (new Date().getFullYear())): QueryResult<FnCommissionForecastByMonth[]> => {
    try {
        const orderParts: any[] = []
        const whereParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        const result = await sql`
            SELECT 
                MONTH(CONVERT(DATE, ReservationDate, 101)) AS Month,
                YEAR(CONVERT(DATE, ReservationDate, 101)) AS Year,
                SUM(NetTotalTCP) AS NetTotalTCP
            FROM 
                Fn_CommissionForecast( ${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
            GROUP BY 
                MONTH(CONVERT(DATE, ReservationDate, 101)),
                YEAR(CONVERT(DATE, ReservationDate, 101))
            ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
        `.execute(db)
        
        const rows: FnCommissionForecastByMonth[] = result.rows as FnCommissionForecastByMonth[]
        return {
            success: true,
            data: rows
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as FnCommissionForecastByMonth[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getCommissionForecastPercentageFn = async (): QueryResult<FnCommissionForecastPercentage> => {
    try {
        
        const result = await sql`
            SELECT 
                SUM(DownPayment) AS TotalForecast,
                SUM(DPPaid) AS TotalPaid,
                (SUM(DPPaid) / SUM(DownPayment)) * 100 AS TotalPaidPercent
            FROM Fn_CommissionForecast(getdate())
        `.execute(db)
        
        const rows: FnCommissionForecastPercentage[] = result.rows as FnCommissionForecastPercentage[]
        return {
            success: true,
            data: rows[0]
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as FnCommissionForecastPercentage,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}