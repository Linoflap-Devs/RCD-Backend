import { endOfDay, format, startOfDay } from "date-fns";
import { db } from "../db/db"
import { DB, TblAgentPendingSalesDtl, TblDistribution, TblSalesBranch, TblSalesSector, TblSalesTarget, TblSalesTranImage, TblSalesTrans, TblSalesTransDtl, VwAgents, VwDivisionSalesTarget, VwSalesTrans, VwSalesTransactions } from "../db/db-types"
import { QueryResult } from "../types/global.types"
import { logger } from "../utils/logger"
import { AddPendingSaleDetail, AgentPendingSale, AgentPendingSalesDetail, AgentPendingSalesWithDetails, DeveloperSales, FnDivisionSales, FnDivisionSalesYearly, FnSalesTarget, IAgentPendingSale, ITblSalesTarget, ITblSalesTrans, SalesTargetTotals, SaleStatus } from "../types/sales.types";
import { TZDate } from "@date-fns/tz";
import { sql, ExpressionBuilder, Selectable, Insertable, Transaction, Updateable } from "kysely";
import { SalesStatusText } from "../types/sales.types";
import { IImage, IImageBase64, ITypedImageBase64 } from "../types/image.types";

// UTILS
function padRandomNumber(num: number, length: number): string {
    return num.toString().padStart(length, '0');
}

function normalizeDistributionValue(value?: string | null): string {
    return value?.trim().toUpperCase() || '';
}

function buildAgentDisplayName(agent: VwAgents): string {
    return `${agent.LastName?.trim()}, ${agent.FirstName?.trim()} ${agent.MiddleName ? agent.MiddleName.trim() : ''}`.trim();
}

type ResolvedCommissionDetailRow = {
    distributionId: number;
    positionName: string;
    positionId: number;
    agentId: number;
    agentName: string;
    commissionRate: number;
}

type ExistingCommissionDetailRow = {
    AgentID: number;
    AgentName: string | null;
    Commission: number;
    CommissionRate: number;
    DistributionID: number | null;
    PositionID: number;
    PositionName: string;
    VATRate: number;
    WTaxRate: number;
}

async function getActiveDistributionTemplateForWrite(trx: Transaction<DB>) {
    return trx.selectFrom('Tbl_Distribution')
        .leftJoin('Tbl_Position', 'Tbl_Distribution.PositionID', 'Tbl_Position.PositionID')
        .selectAll('Tbl_Distribution')
        .select('Tbl_Position.Position')
        .where('IsActive', '=', 1)
        .orderBy('Level', 'asc')
        .execute();
}

async function resolveCommissionDetailRows(
    trx: Transaction<DB>,
    commissionRates?: AddPendingSaleDetail[]
): Promise<ResolvedCommissionDetailRow[]> {
    const templateRows = await getActiveDistributionTemplateForWrite(trx);

    if(templateRows.length === 0){
        throw new Error('No active distribution template found.');
    }

    const commissionMap = new Map<number, AddPendingSaleDetail>();
    for(const commission of commissionRates || []){
        if(commissionMap.has(commission.distributionId)){
            throw new Error(`Duplicate distributionId in commission rates: ${commission.distributionId}`);
        }

        commissionMap.set(commission.distributionId, commission);
    }

    const unknownDistributionIds = Array.from(commissionMap.keys()).filter((distributionId) =>
        !templateRows.some((row) => Number(row.DistributionID) === distributionId)
    );

    if(unknownDistributionIds.length > 0){
        throw new Error(`Unknown distributionId(s): ${unknownDistributionIds.join(', ')}`);
    }

    const agentIds = Array.from(
        new Set(
            (commissionRates || [])
                .filter((commission) => commission.agentId && commission.agentId > 0)
                .map((commission) => Number(commission.agentId))
        )
    );

    const agentData = new Map<number, VwAgents>();
    if(agentIds.length > 0){
        const agentsResult = await trx.selectFrom('Vw_Agents')
            .selectAll()
            .where('AgentID', 'in', agentIds)
            .execute();

        agentsResult.forEach((agent) => {
            agentData.set(agent.AgentID || 0, agent);
        });
    }

    return templateRows.map((templateRow) => {
        const commission = commissionMap.get(Number(templateRow.DistributionID));
        const matchedAgent = commission?.agentId ? agentData.get(commission.agentId) : undefined;

        return {
            distributionId: Number(templateRow.DistributionID),
            positionName: templateRow.Distribution,
            positionId: templateRow.PositionID || 0,
            agentId: commission?.agentId || 0,
            agentName: matchedAgent
                ? buildAgentDisplayName(matchedAgent)
                : (commission?.agentName || ''),
            commissionRate: Number(commission?.commissionRate) || 0
        };
    });
}

async function buildPendingSaleDetailRows(
    trx: Transaction<DB>,
    pendingSalesTranCode: string,
    commissionRates?: AddPendingSaleDetail[]
): Promise<Insertable<TblAgentPendingSalesDtl>[]> {
    const resolvedRows = await resolveCommissionDetailRows(trx, commissionRates);

    return resolvedRows.map((row) => {
        return {
            PendingSalesTranCode: pendingSalesTranCode,
            DistributionID: row.distributionId,
            PositionName: row.positionName,
            PositionID: row.positionId,
            AgentName: row.agentName,
            AgentID: row.agentId,
            CommissionRate: row.commissionRate,
            WTaxRate: 0,
            VATRate: 0,
            Commission: 0
        };
    });
}

async function syncCommissionDetailRows<TExisting extends ExistingCommissionDetailRow>(
    trx: Transaction<DB>,
    existingRows: TExisting[],
    commissionRates: AddPendingSaleDetail[] | undefined,
    updateExistingRow: (existingRow: TExisting, resolvedRow: ResolvedCommissionDetailRow) => Promise<void>,
    insertMissingRow: (resolvedRow: ResolvedCommissionDetailRow) => Promise<void>
) {
    const resolvedRows = await resolveCommissionDetailRows(trx, commissionRates);
    const unmatchedExistingRows = [...existingRows];

    for(const resolvedRow of resolvedRows){
        const existingRowIndex = unmatchedExistingRows.findIndex((row) =>
            (row.DistributionID !== null && Number(row.DistributionID) === resolvedRow.distributionId)
            || (row.DistributionID === null && normalizeDistributionValue(row.PositionName) === normalizeDistributionValue(resolvedRow.positionName))
        );

        if(existingRowIndex >= 0){
            const [existingRow] = unmatchedExistingRows.splice(existingRowIndex, 1);
            await updateExistingRow(existingRow, resolvedRow);
            continue;
        }

        await insertMissingRow(resolvedRow);
    }
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

// export const getSalesTrans = async (
//     filters?: {
//         divisionId?: number,
//         month?: number,
//         year?: number,
//         agentId?: number,
//         createdBy?: number,
//         developerId?: number,
//         isUnique?: boolean,
//         salesBranch?: number,
//         search?: string
//     },
//     pagination?: {
//         page?: number, 
//         pageSize?: number
//     }
// ): QueryResult<{totalResults: number, totalPages: number, totalSales: number, results: VwSalesTrans[]}> => {

//     try {
//         const page = pagination?.page ?? 1;
//         const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
//         const offset = pageSize ? (page - 1) * pageSize : 0;

//         let result = await db.selectFrom('vw_SalesTrans')
//             .selectAll()
//             .where('SalesStatus', '<>', 'ARCHIVED')

//         let totalCountResult = await db
//             .selectFrom("vw_SalesTrans")
//             .select(({ fn }) => [fn.countAll<number>().as("count")])
//             .where('SalesStatus', '<>', 'ARCHIVED')

//         if(filters && filters.divisionId) {
//             result = result.where('DivisionID', '=', filters.divisionId)
//             totalCountResult = totalCountResult.where('DivisionID', '=', filters.divisionId)
//         }

//         if(filters && filters.developerId){
//             result = result.where('DeveloperID', '=', filters.developerId)
//             totalCountResult = totalCountResult.where('DeveloperID', '=', filters.developerId)
//         }
        

//         if(filters && filters.salesBranch){
//             result = result.where('SalesBranchID', '=', filters.salesBranch)
//             totalCountResult = totalCountResult.where('SalesBranchID', '=', filters.salesBranch)
//         }

//         if(filters && filters.month){
//             const year = filters.year ? filters.year : new Date().getFullYear();
//             const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
//             const lastDayOfMonth = new Date(year, filters.month, 0).getDate(); // Get the last day number
//             const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
//             const monthStart = startOfDay(firstDayManila);
//             const monthEnd = endOfDay(lastDayManila);
            
//             const firstDay = new Date(monthStart.getTime());
//             const lastDay = new Date(monthEnd.getTime());

//             // const firstDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month - 1, 1)
//             // const lastDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month, 1)
//             result = result.where('ReservationDateFormatted', '>', firstDay)
//             result = result.where('ReservationDateFormatted', '<', lastDay)
//             totalCountResult = totalCountResult.where('ReservationDateFormatted', '>', firstDay)
//             totalCountResult = totalCountResult.where('ReservationDateFormatted', '<', lastDay)
//         }

//         if(filters && filters.year && !filters.month){
//             const firstDayManila = new TZDate(filters.year, 0, 1, 0, 0, 0, 0, 'Asia/Manila');
//             const lastDayManila = new TZDate(filters.year, 11, 31, 23, 59, 59, 999, 'Asia/Manila');

//             const yearStart = startOfDay(firstDayManila);
//             const yearEnd = endOfDay(lastDayManila);
                    
//             const firstDay = new Date(yearStart.getTime());
//             const lastDay = new Date(yearEnd.getTime());
            
//             result = result.where('ReservationDateFormatted', '>=', firstDay)
//             result = result.where('ReservationDateFormatted', '<=', lastDay)
//             totalCountResult = totalCountResult.where('ReservationDateFormatted', '>=', firstDay)
//             totalCountResult = totalCountResult.where('ReservationDateFormatted', '<=', lastDay)
//         }

//         if(filters && filters.search) {
//         const searchTerm = `%${filters.search}%`;
//         console.log(    )
//         const searchAsNumber = Number(filters.search);
//         const isValidNumber = !isNaN(searchAsNumber) && filters.search.trim() !== '';
        
//         result = result.where(({ or, eb }) => 
//             or([
//                 // String columns - always search these
//                 eb('SalesTranCode', 'like', searchTerm),
//                 eb('DeveloperName', 'like', searchTerm),
//                 eb('ProjectName', 'like', searchTerm),
//                 eb('Division', 'like', searchTerm),
//                 eb('SalesStatus', 'like', searchTerm),
//                 // Numeric column - only search if valid number
//                 ...(isValidNumber ? [eb('SalesTranID', '=', searchAsNumber)] : [])
//             ])
//         );
        
//         totalCountResult = totalCountResult.where(({ or, eb }) => 
//             or([
//                 eb('SalesTranCode', 'like', searchTerm),
//                 eb('DeveloperName', 'like', searchTerm),
//                 eb('ProjectName', 'like', searchTerm),
//                 eb('Division', 'like', searchTerm),
//                 eb('SalesStatus', 'like', searchTerm),
//                 ...(isValidNumber ? [eb('SalesTranID', '=', searchAsNumber)] : [])
//             ])
//         );
//     }

//         result = result.orderBy('ReservationDateFormatted', 'desc')
        
//         if(pagination && pagination.page && pagination.pageSize){
//             result = result.offset(offset).fetch(pagination.pageSize)
//         }
        
//         const queryResult = await result.execute();
//         const countResult = await totalCountResult.execute();
//         if(!result){
//             throw new Error('No sales found.')
//         }

//         const totalCount = countResult ? Number(countResult[0].count) : 0;
//         const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

//         console.log('totalPages', totalPages)
        
//         let filteredResult = queryResult

//         // Filter to get unique ProjectName records (keeps first occurrence)
//         if(filters && filters.isUnique  && filters.isUnique === true){
//             const uniqueProjects = new Map();
//             filteredResult = queryResult.filter(record => {
//                 if (!uniqueProjects.has(record.SalesTranCode)) {
//                     uniqueProjects.set(record.SalesTranCode, true);
//                     return true;
//                 }
//                 return false;
//             })
//         }
        
//         return {
//             success: true,
//             data: {
//                 totalResults: totalCount,
//                 totalPages: totalPages,
//                 results: filteredResult
//             }
//         }
//     }

//     catch(err: unknown){
//         const error = err as Error;
//         return {
//             success: false,
//             data: {} as {totalResults: number, totalPages: number, results: VwSalesTrans[]},
//             error: {
//                 code: 500,
//                 message: error.message
//             }
//         }
//     }
// }

export const getSalesTrans = async (
    filters?: {
        divisionId?: number,
        month?: number,
        year?: number,
        agentId?: number,
        createdBy?: number,
        developerId?: number,
        isUnique?: boolean,
        salesBranch?: number,
        search?: string
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, totalSales: number, results: VwSalesTrans[]}> => {

    try {
        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined;
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('vw_SalesTrans')
            .selectAll()
            .where('SalesStatus', '<>', 'ARCHIVED')

        let totalCountResult = await db
            .selectFrom("vw_SalesTrans")
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('SalesStatus', '<>', 'ARCHIVED')

        // Add totalSales query
        let totalSalesResult = await db
            .selectFrom("vw_SalesTrans")
            .select(({ fn }) => [
                fn.sum<number>('NetTotalTCP').as("totalSales")
            ])
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.divisionId) {
            result = result.where('DivisionID', '=', filters.divisionId)
            totalCountResult = totalCountResult.where('DivisionID', '=', filters.divisionId)
            totalSalesResult = totalSalesResult.where('DivisionID', '=', filters.divisionId)
        }

        if(filters && filters.developerId){
            result = result.where('DeveloperID', '=', filters.developerId)
            totalCountResult = totalCountResult.where('DeveloperID', '=', filters.developerId)
            totalSalesResult = totalSalesResult.where('DeveloperID', '=', filters.developerId)
        }

        if(filters && filters.salesBranch){
            result = result.where('SalesBranchID', '=', filters.salesBranch)
            totalCountResult = totalCountResult.where('SalesBranchID', '=', filters.salesBranch)
            totalSalesResult = totalSalesResult.where('SalesBranchID', '=', filters.salesBranch)
        }

        if(filters && filters.month){
            const year = filters.year ? filters.year : new Date().getFullYear();
            const firstDayManila = new TZDate(year, filters.month - 1, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayOfMonth = new Date(year, filters.month, 0).getDate();
            const lastDayManila = new TZDate(year, filters.month - 1, lastDayOfMonth, 23, 59, 59, 999, 'Asia/Manila');
        
            const monthStart = startOfDay(firstDayManila);
            const monthEnd = endOfDay(lastDayManila);
            
            const firstDay = new Date(monthStart.getTime());
            const lastDay = new Date(monthEnd.getTime());

            result = result.where('ReservationDateFormatted', '>', firstDay)
            result = result.where('ReservationDateFormatted', '<', lastDay)
            totalCountResult = totalCountResult.where('ReservationDateFormatted', '>', firstDay)
            totalCountResult = totalCountResult.where('ReservationDateFormatted', '<', lastDay)
            totalSalesResult = totalSalesResult.where('ReservationDateFormatted', '>', firstDay)
            totalSalesResult = totalSalesResult.where('ReservationDateFormatted', '<', lastDay)
        }

        if(filters && filters.year && !filters.month){
            const firstDayManila = new TZDate(filters.year, 0, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayManila = new TZDate(filters.year, 11, 31, 23, 59, 59, 999, 'Asia/Manila');

            const yearStart = startOfDay(firstDayManila);
            const yearEnd = endOfDay(lastDayManila);
                    
            const firstDay = new Date(yearStart.getTime());
            const lastDay = new Date(yearEnd.getTime());
            
            result = result.where('ReservationDateFormatted', '>=', firstDay)
            result = result.where('ReservationDateFormatted', '<=', lastDay)
            totalCountResult = totalCountResult.where('ReservationDateFormatted', '>=', firstDay)
            totalCountResult = totalCountResult.where('ReservationDateFormatted', '<=', lastDay)
            totalSalesResult = totalSalesResult.where('ReservationDateFormatted', '>=', firstDay)
            totalSalesResult = totalSalesResult.where('ReservationDateFormatted', '<=', lastDay)
        }

        if(filters && filters.search) {
            const searchTerm = `%${filters.search}%`;
            const searchAsNumber = Number(filters.search);
            const isValidNumber = !isNaN(searchAsNumber) && filters.search.trim() !== '';
            
            result = result.where(({ or, eb }) => 
                or([
                    eb('SalesTranCode', 'like', searchTerm),
                    eb('DeveloperName', 'like', searchTerm),
                    eb('ProjectName', 'like', searchTerm),
                    eb('Division', 'like', searchTerm),
                    eb('SalesStatus', 'like', searchTerm),
                    ...(isValidNumber ? [eb('SalesTranID', '=', searchAsNumber)] : [])
                ])
            );
            
            totalCountResult = totalCountResult.where(({ or, eb }) => 
                or([
                    eb('SalesTranCode', 'like', searchTerm),
                    eb('DeveloperName', 'like', searchTerm),
                    eb('ProjectName', 'like', searchTerm),
                    eb('Division', 'like', searchTerm),
                    eb('SalesStatus', 'like', searchTerm),
                    ...(isValidNumber ? [eb('SalesTranID', '=', searchAsNumber)] : [])
                ])
            );

            totalSalesResult = totalSalesResult.where(({ or, eb }) => 
                or([
                    eb('SalesTranCode', 'like', searchTerm),
                    eb('DeveloperName', 'like', searchTerm),
                    eb('ProjectName', 'like', searchTerm),
                    eb('Division', 'like', searchTerm),
                    eb('SalesStatus', 'like', searchTerm),
                    ...(isValidNumber ? [eb('SalesTranID', '=', searchAsNumber)] : [])
                ])
            );
        }

        result = result.orderBy('ReservationDateFormatted', 'desc')
        
        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
        }
        
        const queryResult = await result.execute();
        const countResult = await totalCountResult.execute();
        const salesResult = await totalSalesResult.execute();
        
        if(!result){
            throw new Error('No sales found.')
        }

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;
        const totalSales = salesResult && salesResult[0]?.totalSales 
            ? Number(salesResult[0].totalSales) 
            : 0;

        console.log('totalPages', totalPages)
        
        let filteredResult = queryResult

        // Filter to get unique ProjectName records (keeps first occurrence)
        if(filters && filters.isUnique && filters.isUnique === true){
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
                totalSales: totalSales,
                results: filteredResult
            }
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, totalSales: number, results: VwSalesTrans[]},
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

export const getSalesDistributionBySalesTranDtlId = async (salesTranDtlId: number): QueryResult<VwSalesTransactions[]> => {
    try {
        const saleTranDtl = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('SalesTransDtlID', '=', salesTranDtlId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .executeTakeFirst()

        if(!saleTranDtl){
            return {
                success: false,
                data: [] as VwSalesTransactions[],
                error: {
                    code: 404,
                    message: 'No sales transaction details found.'
                }
            }
        }

        const result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('SalesTranID', '=', saleTranDtl.SalesTranID)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .execute();

        if(!result){
            return {
                success: false,
                data: [] as VwSalesTransactions[],
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
    user: {
        agentId?: number, 
        brokerName?: string
    },
    filters?: { month?: number, year?: number, search?: string }, 
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalPages: number, results: VwSalesTransactions[]}> => {
    try {

        console.log('user', user)
        console.log('filters', filters)
        console.log('pagination', pagination)

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('SalesStatus', '<>', 'ARCHIVED')

        let totalCountResult = await db.selectFrom('Vw_SalesTransactions')
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(user.agentId){
            result = result.where('AgentID', '=', user.agentId)
            totalCountResult = totalCountResult.where('AgentID', '=', user.agentId)
        }

        if(user.brokerName){
            result = result.where('PositionName', '=', 'BROKER')
            result = result.where('AgentName', '=', user.brokerName)

            totalCountResult = totalCountResult.where('PositionName', '=', 'BROKER')
            totalCountResult = totalCountResult.where('AgentName', '=', user.brokerName)
        }

        if(filters && filters.month){
            const year = filters.year ?? new Date().getFullYear();
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

        if(filters && filters.year && !filters.month){
            const firstDayManila = new TZDate(filters.year, 0, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayManila = new TZDate(filters.year, 11, 31, 23, 59, 59, 999, 'Asia/Manila');

            const yearStart = startOfDay(firstDayManila);
            const yearEnd = endOfDay(lastDayManila);
                    
            const firstDay = new Date(yearStart.getTime());
            const lastDay = new Date(yearEnd.getTime());
            
            result = result.where('ReservationDate', '>=', firstDay)
            result = result.where('ReservationDate', '<=', lastDay)
            totalCountResult = totalCountResult.where('ReservationDate', '>=', firstDay)
            totalCountResult = totalCountResult.where('ReservationDate', '<=', lastDay)
        }

        if(filters && filters.search){
            const searchTerm = `%${filters.search}%`;
            console.log(    )
            const searchAsNumber = Number(filters.search);
            const isValidNumber = !isNaN(searchAsNumber) && filters.search?.trim() !== '';

            // Parse the search term as a date (e.g. '2026-03-17')
            const searchAsDate = new Date(filters.search);
            const isValidDate = !isNaN(searchAsDate.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(filters.search.trim());

            // Build the start and end of the day if it's a valid date
            const startOfDay = isValidDate ? new Date(`${filters.search}T00:00:00.000`) : null;
            const endOfDay   = isValidDate ? new Date(`${filters.search}T23:59:59.999`) : null;

            
            result = result.where(({ or, eb }) => 
                or([
                    // String columns - always search these
                    eb('SalesTranCode', 'like', searchTerm),
                    eb('SellerName', 'like', searchTerm),
                    eb('ProjectName', 'like', searchTerm),
                    eb('Division', 'like', searchTerm),
                    eb('PositionName', 'like', searchTerm),
                    ...(isValidDate ? [
                        eb.and([
                            eb('ReservationDate', '>=', startOfDay),
                            eb('ReservationDate', '<=', endOfDay),
                        ])
                    ] : [])
                ])
            );
            
            totalCountResult = totalCountResult.where(({ or, eb }) => 
                or([
                   // String columns - always search these
                    eb('SalesTranCode', 'like', searchTerm),
                    eb('SellerName', 'like', searchTerm),
                    eb('ProjectName', 'like', searchTerm),
                    eb('Division', 'like', searchTerm),
                    eb('PositionName', 'like', searchTerm),
                ])
            );
        }


        result = result.orderBy('DateFiled', 'desc')

        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
            //totalCountResult = totalCountResult.offset(offset).fetch(pagination.pageSize)
        }
            
        const queryResult = await result.execute()
        const countResult = await totalCountResult.execute()

        
        if(!queryResult){
            console.log(queryResult)
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

export const getTotalPersonalSales = async (user: {agentId?: number, brokerName?: string}, filters?: { month?: number, year?: number}): QueryResult<number> => {
    try {
        let result = await db.selectFrom('Vw_SalesTransactions')
            .select(({fn, val, ref}) => [
                fn.sum(ref('NetTotalTCP')).as('TotalSales')
            ])
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(user.agentId){
            result = result.where('AgentID', '=', user.agentId)
        }

        if(user.brokerName){
            result = result.where('PositionName', '=', 'BROKER')
            result = result.where('AgentName', '=', user.brokerName)
        }

        if(filters && filters.month){

            const year = filters.year || new Date().getFullYear();
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

export const getMultipleTotalPersonalSales = async (
    user: {
        agentIds?: number[], 
        brokerNames?: string[]
    }, 
    filters?: { 
        month?: number, 
        year?: number
    }
): QueryResult<{TotalSales: number, AgentID?: number, AgentName: string}[]> => {
    try {
        let result = await db.selectFrom('Vw_SalesTransactions')
            .select(({fn, val, ref}) => [
                fn.sum(ref('NetTotalTCP')).as('TotalSales')
            ])
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(user.agentIds && user.agentIds.length > 0){
            result = result.where('AgentID', 'in', user.agentIds)

            result = result.groupBy('AgentName')
            result = result.groupBy('AgentID')

            result = result.select(['AgentID', 'AgentName'])
        }

        if(user.brokerNames){
            result = result.where('PositionName', '=', 'BROKER')
            result = result.where('AgentName', 'in', user.brokerNames)

            result = result.groupBy('AgentName')

            result = result.select(['AgentName'])
        }

        if(filters && filters.month){

            const year = filters.year || new Date().getFullYear();
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
            data: queryResult as {TotalSales: number, AgentID?: number, AgentName: string}[]
        }
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as {TotalSales: number, AgentID?: number, AgentName: string}[],
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

            const year = filters.year || new Date().getFullYear();
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

            const year = filters.year || new Date().getFullYear();
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
            FROM Fn_DivisionSalesV2(${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
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
        let base = await db.selectFrom('vw_DivisionSalesTargetV2')
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
        let base = await db.selectFrom('vw_DivisionSalesTargetV2')
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
    field: 'DeveloperName' | 'NetTotalTCP'
    direction: 'asc' | 'desc'
}


export const getSalesByDeveloperTotals = async (sorts?: DeveloperSalesSortOption[], take?: number, date?: Date, filters?: {month?: number, year?: number}): QueryResult<DeveloperSales[]> => {
    try {
       let base = await db.selectFrom('vw_SalesTrans')
            .select([
                'DeveloperName',
                (eb) => eb.fn.sum('NetTotalTCP').as('NetTotalTCP')
            ])
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('DeveloperID', 'is not', null)
            .where('DeveloperID', '>', 0)
            .groupBy('DeveloperName')

        if(date){
            const month = date.getMonth() + 1

            base = base.where((eb) => eb.fn('MONTH', ['ReservationDate']), '=', month)
        }

        if(filters && filters.month){
            base = base.where((eb) => eb.fn('MONTH', ['ReservationDate']), '=', filters.month)
        }

        if(filters && filters.year){
            base = base.where((eb) => eb.fn('YEAR', ['ReservationDate']), '=', filters.year)
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
        excPendingSaleIds?: number[],
        month?: number,
        year?: number,
        agentId?: number,
        excAgentId?: number,
        brokerName?: string,
        createdBy?: number,
        createdByWeb?: number,
        assignedUM?: number | null,
        developerId?: number,
        isUnique?: boolean,
        approvalStatus?: number[],
        salesBranch?: number,
        showRejected?: boolean
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalPages: number, results: AgentPendingSale[]}> => {

    console.log(filters)
    

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

        if(filters && filters.excPendingSaleIds && filters.excPendingSaleIds.length > 0){
            result = result.where('AgentPendingSalesID', 'not in', filters.excPendingSaleIds)
            totalCountResult = totalCountResult.where('AgentPendingSalesID', 'not in', filters.excPendingSaleIds)
        }

        if(filters && filters.developerId){
            result = result.where('DeveloperID', '=', filters.developerId)
            totalCountResult = totalCountResult.where('DeveloperID', '=', filters.developerId)
        }

        if(filters && filters.approvalStatus && filters.approvalStatus.length > 0){
            result = result.where('ApprovalStatus', 'in', filters.approvalStatus)
            totalCountResult = totalCountResult.where('ApprovalStatus', 'in', filters.approvalStatus)
        }

        if(filters && filters.salesBranch){
            result = result.where('SalesBranchID', '=', filters.salesBranch)
            totalCountResult = totalCountResult.where('SalesBranchID', '=', filters.salesBranch)
        }

        if(filters && filters.assignedUM){
            result = result.where('AssignedUM', '=', filters.assignedUM)
            totalCountResult = totalCountResult.where('AssignedUM', '=', filters.assignedUM)
        }

        if(filters && filters.assignedUM === null){
            result = result.where('AssignedUM', 'is', null)
            totalCountResult = totalCountResult.where('AssignedUM', 'is', null)
        }

        if(filters && filters.agentId){
            const agentId = filters.agentId; // Capture the value

            result = result.where('AgentID', '=', agentId)
            totalCountResult = totalCountResult.where('AgentID', '=', agentId)
            
            // result = result.where((eb) => 
            //     eb.or([
            //         eb('AgentID', '=', agentId),
            //         eb('CreatedBy', '=', agentId)
            //     ])
            // )
            // totalCountResult = totalCountResult.where((eb) => 
            //     eb.or([
            //         eb('AgentID', '=', agentId),
            //         eb('CreatedBy', '=', agentId)
            //     ])
            // )
        }

        if(filters && filters.excAgentId){
            const excAgentId = filters.excAgentId; // Capture the value

            result = result.where('AgentID', '<>', excAgentId)
            totalCountResult = totalCountResult.where('AgentID', '<>', excAgentId)
        }

        if(filters && filters.createdBy){
            result = result.where('CreatedBy', '=', filters.createdBy)
            totalCountResult = totalCountResult.where('CreatedBy', '=', filters.createdBy)
        }

        if(filters && filters.createdByWeb){
            result = result.where('CreatedByWeb', '=', filters.createdByWeb)
            totalCountResult = totalCountResult.where('CreatedByWeb', '=', filters.createdByWeb)
        }

        if(filters && filters.brokerName){
            result = result.where('AgentName', '=', filters.brokerName)
            totalCountResult = totalCountResult.where('AgentName', '=', filters.brokerName)

            result = result.where('PositionName', '=', 'BROKER')
            totalCountResult = totalCountResult.where('PositionName', '=', 'BROKER')
        }

        if(filters && filters.month){
            const year = filters.year || new Date().getFullYear();
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

        if(filters && filters.year && !filters.month){
            const firstDayManila = new TZDate(filters.year, 0, 1, 0, 0, 0, 0, 'Asia/Manila');
            const lastDayManila = new TZDate(filters.year, 11, 31, 23, 59, 59, 999, 'Asia/Manila');

            const yearStart = startOfDay(firstDayManila);
            const yearEnd = endOfDay(lastDayManila);
                    
            const firstDay = new Date(yearStart.getTime());
            const lastDay = new Date(yearEnd.getTime());
            
            result = result.where('ReservationDate', '>=', firstDay)
            result = result.where('ReservationDate', '<=', lastDay)
            totalCountResult = totalCountResult.where('ReservationDate', '>=', firstDay)
            totalCountResult = totalCountResult.where('ReservationDate', '<=', lastDay)
        }

        if(filters && filters.showRejected !== true){
            // If filtering by agentId, show rejected sales for that agent
            if(filters && filters.agentId){
                const agentId = filters.agentId;
                
                // Show non-rejected sales OR rejected sales belonging to this agent
                result = result.where((eb) => 
                    eb.or([
                        eb('IsRejected', '=', 0),
                        eb.and([
                            eb('IsRejected', '=', 1),
                            eb.or([
                                eb('CreatedBy', '=', agentId),
                                eb('AgentID', '=', agentId),
                            ])
                        ])
                    ])
                )
                totalCountResult = totalCountResult.where((eb) => 
                    eb.or([
                        eb('IsRejected', '=', 0),
                        eb.and([
                            eb('IsRejected', '=', 1),
                            eb.or([
                                eb('AgentID', '=', agentId),
                                eb('CreatedBy', '=', agentId)
                            ])
                        ])
                    ])
                )
            } else {
                // Default behavior: hide all rejected sales
                result = result.where('IsRejected', '=', 0)
                totalCountResult = totalCountResult.where('IsRejected', '=', 0)
            }
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

export const getPendingSalesV2 = async (
    divisionId?: number,
    filters?: {
        excPendingSaleIds?: number[],
        month?: number,
        year?: number,
        agentId?: number,
        excAgentId?: number,
        brokerName?: string,
        createdBy?: number,
        createdByWeb?: number,
        assignedUM?: number | null,
        developerId?: number,
        isUnique?: boolean,
        approvalStatus?: number[],
        salesBranch?: number,
        showRejected?: boolean
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalPages: number, results: AgentPendingSale[]}> => {

   try {
        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? null;

        // Call the table-valued function
        const results = await sql<AgentPendingSale>`
            SELECT * FROM dbo.fn_GetPendingSales(
                ${divisionId ?? null},
                ${filters?.excPendingSaleIds?.join(',') ?? null},
                ${filters?.month ?? null},
                ${filters?.year ?? null},
                ${filters?.agentId ?? null},
                ${filters?.excAgentId ?? null},
                ${filters?.brokerName ?? null},
                ${filters?.createdBy ?? null},
                ${filters?.createdByWeb ?? null},
                ${filters?.assignedUM ?? null},
                ${filters?.developerId ?? null},
                ${filters?.isUnique ? 1 : 0},
                ${filters?.approvalStatus?.join(',') ?? null},
                ${filters?.salesBranch ?? null},
                ${filters?.showRejected ? 1 : 0},
                ${page || null},
                ${pageSize || null}
            )
        `.execute(db);

        // Get total count (you'd need a separate count function or query)
        const countResult = await sql<{ count: number }>`
            SELECT COUNT(*) as count FROM dbo.fn_GetPendingSales(
                ${divisionId ?? null},
                ${filters?.excPendingSaleIds?.join(',') ?? null},
                ${filters?.month ?? null},
                ${filters?.year ?? null},
                ${filters?.agentId ?? null},
                ${filters?.excAgentId ?? null},
                ${filters?.brokerName ?? null},
                ${filters?.createdBy ?? null},
                ${filters?.createdByWeb ?? null},
                ${filters?.assignedUM ?? null},
                ${filters?.developerId ?? null},
                ${filters?.isUnique ? 1 : 0},
                ${filters?.approvalStatus?.join(',') ?? null},
                ${filters?.salesBranch ?? null},
                ${filters?.showRejected ? 1 : 0},
                1,
                NULL
            )
        `.execute(db);

        const totalCount = Number(countResult.rows[0]?.count ?? 0);
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

        return {
            success: true,
            data: {
                totalPages: totalPages,
                results: results.rows
            }
        };
    } catch(err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as {totalPages: number, results: AgentPendingSale[]},
            error: {
                code: 500,
                message: error.message
            }
        };
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
                'Tbl_AgentPendingSales.AssignedUM',
                'Tbl_AgentPendingSales.Block',
                'Tbl_AgentPendingSales.BuyersAddress',
                'Tbl_AgentPendingSales.BuyersContactNumber',
                'Tbl_AgentPendingSales.BuyersName',
                'Tbl_AgentPendingSales.BuyersOccupation',
                'Tbl_AgentPendingSales.CommStatus',
                'Tbl_AgentPendingSales.CreatedBy',
                'Tbl_AgentPendingSales.CreatedByWeb',
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
                'Tbl_AgentPendingSales.LastUpdateByWeb',
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
                'Tbl_AgentPendingSales.IsRejected',
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
        
        let imgs: ITypedImageBase64[] = []

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
                        FileContent: img.FileContent ? img.FileContent.toString('base64') : '',
                        ImageType: fileName.includes('receipt') ? 'receipt' : fileName.includes('agreement') ? 'agreement' : 'other',
                        StorageKey: img.StorageKey
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
        sectorID: number,
        assignedUM?: number,
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
            lotArea?: number | null,
            flrArea?: number | null,
            developerID: number,
            developerCommission: number,
            netTCP: number,
            miscFee: number | null,
            financingScheme: string,
        },
        payment: {
            downpayment: number | null,
            dpTerms: number | null,
            monthlyPayment: number | null
            dpStartDate: Date | null,
            sellerName: string,
        },
        images?: {
            receipt?: IImage,
            agreement?: IImage,
        },
        commissionRates?: AddPendingSaleDetail[]
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

                AssignedUM: data.assignedUM || null,

                ProjectID: data.property.projectID,
                Block: data.property.blkFlr,
                Lot: data.property.lotUnit,
                Phase: data.property.phase,
                LotArea: data.property.lotArea || 0,
                FloorArea: data.property.flrArea || 0,
                DeveloperID: data.property.developerID,
                DevCommType: data.property.developerCommission.toString(),
                NetTotalTCP: data.property.netTCP,
                MiscFee: data.property.miscFee || 0,
                FinancingScheme: data.property.financingScheme,

                DownPayment: data.payment.downpayment || 0,
                DPTerms: data.payment.dpTerms ? data.payment.dpTerms.toString() : '0', 
                MonthlyDP: data.payment.monthlyPayment || 0,
                DPStartSchedule: data.payment.dpStartDate,
                CreatedBy: user.agentUserId ? user.agentUserId : null,
                CreatedByWeb: user.webUserId ? user.webUserId : null,
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

        const pendingSaleDetailRows = await buildPendingSaleDetailRows(
            trx,
            result.PendingSalesTranCode,
            userRole !== 'SALES PERSON' ? data.commissionRates : undefined
        );

        const salesDetails = await trx.insertInto('Tbl_AgentPendingSalesDtl')
            .values(pendingSaleDetailRows)
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

export const addPendingSaleR2 = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    userRole: string,
    data: {
        reservationDate: Date,
        divisionID: number,
        salesBranchID: number,
        sectorID: number,
        assignedUM?: number,
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
            lotArea?: number | null,
            flrArea?: number | null,
            developerID: number,
            developerCommission: number,
            netTCP: number,
            miscFee: number | null,
            financingScheme: string,
        },
        payment: {
            downpayment: number | null,
            dpTerms: number | null,
            monthlyPayment: number | null
            dpStartDate: Date | null,
            sellerName: string,
        },
        commissionRates?: AddPendingSaleDetail[]
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

                AssignedUM: data.assignedUM || null,

                ProjectID: data.property.projectID,
                Block: data.property.blkFlr,
                Lot: data.property.lotUnit,
                Phase: data.property.phase,
                LotArea: data.property.lotArea || 0,
                FloorArea: data.property.flrArea || 0,
                DeveloperID: data.property.developerID,
                DevCommType: data.property.developerCommission.toString(),
                NetTotalTCP: data.property.netTCP,
                MiscFee: data.property.miscFee || 0,
                FinancingScheme: data.property.financingScheme,

                DownPayment: data.payment.downpayment || 0,
                DPTerms: data.payment.dpTerms ? data.payment.dpTerms.toString() : '0', 
                MonthlyDP: data.payment.monthlyPayment || 0,
                DPStartSchedule: data.payment.dpStartDate,
                CreatedBy: user.agentUserId ? user.agentUserId : null,
                CreatedByWeb: user.webUserId ? user.webUserId : null,
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

        const pendingSaleDetailRows = await buildPendingSaleDetailRows(
            trx,
            result.PendingSalesTranCode,
            userRole !== 'SALES PERSON' ? data.commissionRates : undefined
        );

        const salesDetails = await trx.insertInto('Tbl_AgentPendingSalesDtl')
            .values(pendingSaleDetailRows)
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
//         commissionRates?: AddPendingSaleDetail[]
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
        dpStartDate?: Date | null,
        sellerName?: string,
        assignedUM?: number,
        approvalStatus?: number,
        salesStatus?: string,
        images?: {
            receipt?: IImage,
            agreement?: IImage,
        },
        commissionRates?: AddPendingSaleDetail[]
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
            LastUpdateby: user.agentUserId ? user.agentUserId : null,
            LastUpdateByWeb: user.webUserId ? user.webUserId : null,
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
        if(data.dpStartDate !== undefined) updateData.DPStartSchedule = data.dpStartDate ? data.dpStartDate : null;
        if(data.sellerName !== undefined) updateData.SellerName = data.sellerName;
        if(data.assignedUM !== undefined) updateData.AssignedUM = data.assignedUM;
        if(data.approvalStatus !== undefined) updateData.ApprovalStatus = data.approvalStatus;
        if(data.salesStatus !== undefined) updateData.SalesStatus = data.salesStatus;

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
        if(data.commissionRates !== undefined){
            const existingDetails = await trx.selectFrom('Tbl_AgentPendingSalesDtl')
                .selectAll()
                .where('PendingSalesTranCode', '=', existingSale.PendingSalesTranCode)
                .execute();

            await syncCommissionDetailRows(
                trx,
                existingDetails,
                data.commissionRates,
                async (existingRow, resolvedRow) => {
                    await trx.updateTable('Tbl_AgentPendingSalesDtl')
                        .set({
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate
                        })
                        .where('AgentPendingSalesDtlID', '=', existingRow.AgentPendingSalesDtlID)
                        .execute();
                },
                async (resolvedRow) => {
                    await trx.insertInto('Tbl_AgentPendingSalesDtl')
                        .values({
                            PendingSalesTranCode: existingSale.PendingSalesTranCode,
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate,
                            WTaxRate: 0,
                            VATRate: 0,
                            Commission: 0
                        })
                        .execute();
                }
            );
        }

        if(existingSale.IsRejected === 1 && existingSale.CreatedBy === user.agentUserId){
            const result = await trx.updateTable('Tbl_AgentPendingSales')
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .set({ IsRejected: 0 })
            .execute()
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

export const editPendingSaleR2 = async (
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
        dpStartDate?: Date | null,
        sellerName?: string,
        assignedUM?: number,
        approvalStatus?: number,
        salesStatus?: string,
        commissionRates?: AddPendingSaleDetail[]
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
            LastUpdateby: user.agentUserId ? user.agentUserId : null,
            LastUpdateByWeb: user.webUserId ? user.webUserId : null,
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
        if(data.dpStartDate !== undefined) updateData.DPStartSchedule = data.dpStartDate ? data.dpStartDate : null;
        if(data.sellerName !== undefined) updateData.SellerName = data.sellerName;
        if(data.assignedUM !== undefined) updateData.AssignedUM = data.assignedUM;
        if(data.approvalStatus !== undefined) updateData.ApprovalStatus = data.approvalStatus;
        if(data.salesStatus !== undefined) updateData.SalesStatus = data.salesStatus;

        // Update the pending sale
        const result = await trx.updateTable('Tbl_AgentPendingSales')
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        // Handle commission rates if provided
        if(data.commissionRates !== undefined){
            const existingDetails = await trx.selectFrom('Tbl_AgentPendingSalesDtl')
                .selectAll()
                .where('PendingSalesTranCode', '=', existingSale.PendingSalesTranCode)
                .execute();

            await syncCommissionDetailRows(
                trx,
                existingDetails,
                data.commissionRates,
                async (existingRow, resolvedRow) => {
                    await trx.updateTable('Tbl_AgentPendingSalesDtl')
                        .set({
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate
                        })
                        .where('AgentPendingSalesDtlID', '=', existingRow.AgentPendingSalesDtlID)
                        .execute();
                },
                async (resolvedRow) => {
                    await trx.insertInto('Tbl_AgentPendingSalesDtl')
                        .values({
                            PendingSalesTranCode: existingSale.PendingSalesTranCode,
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate,
                            WTaxRate: 0,
                            VATRate: 0,
                            Commission: 0
                        })
                        .execute();
                }
            );
        }

        if(existingSale.IsRejected === 1 && existingSale.CreatedBy === user.agentUserId){
            const result = await trx.updateTable('Tbl_AgentPendingSales')
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .set({ IsRejected: 0 })
            .execute()
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
export const editPendingSalesDetails = async (agentId: number, pendingSalesId: number, data?: AddPendingSaleDetail[]): QueryResult<any> => {
    const trx = await db.startTransaction().execute();

    try {
        const existingSale = await trx.selectFrom('Tbl_AgentPendingSales')
            .selectAll()
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirst();

        if(!existingSale){
            throw new Error('Pending sale not found');
        }

        if(data !== undefined){
            const existingDetails = await trx.selectFrom('Tbl_AgentPendingSalesDtl')
                .selectAll()
                .where('PendingSalesTranCode', '=', existingSale.PendingSalesTranCode)
                .execute();

            await syncCommissionDetailRows(
                trx,
                existingDetails,
                data,
                async (existingRow, resolvedRow) => {
                    await trx.updateTable('Tbl_AgentPendingSalesDtl')
                        .set({
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate
                        })
                        .where('AgentPendingSalesDtlID', '=', existingRow.AgentPendingSalesDtlID)
                        .execute();
                },
                async (resolvedRow) => {
                    await trx.insertInto('Tbl_AgentPendingSalesDtl')
                        .values({
                            PendingSalesTranCode: existingSale.PendingSalesTranCode,
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate,
                            WTaxRate: 0,
                            VATRate: 0,
                            Commission: 0
                        })
                        .execute();
                }
            );
        }

        // update parent pending sale
        await trx.updateTable('Tbl_AgentPendingSales')
            .set({
                LastUpdate: new Date(),
                LastUpdateby: agentId,
                LastUpdateByWeb: null,
                Remarks: null,
                ApprovalStatus: SaleStatus.UNIT_MANAGER_APPROVED,
                SalesStatus: SalesStatusText.PENDING_SD
            })
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirstOrThrow();

        const updatedDetails = await trx.selectFrom('Tbl_AgentPendingSalesDtl')
            .selectAll()
            .where('PendingSalesTranCode', '=', existingSale.PendingSalesTranCode)
            .execute();

        await trx.commit().execute();

        return {
            success: true,
            data: updatedDetails
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
        dpStartDate?: Date | null,
        sellerName?: string,
        images?: {
            receipt?: IImage,
            agreement?: IImage,
        },
        commissionRates?: AddPendingSaleDetail[]
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
            LastUpdateby: userId || undefined,
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
        if(data.dpStartDate !== undefined) updateData.DPStartSchedule = data.dpStartDate ? data.dpStartDate : null;
        if(data.sellerName !== undefined) updateData.SellerName = data.sellerName;

        // Update the pending sale
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

            console.log(existingImages, existingReceiptId, existingAgreementId)

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
                        PendingSalesTransID: existingImages.length > 0 ? existingImages[0].PendingSalesTransID : 0,
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
                        PendingSalesTransID: existingImages.length > 0 ? existingImages[0].PendingSalesTransID : 0,
                        SalesTransID: salesTranId,
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
        if(data.commissionRates !== undefined){
            const existingDetails = await trx.selectFrom('Tbl_SalesTransDtl')
                .selectAll()
                .where('SalesTranCode', '=', existingSale.SalesTranCode)
                .execute();

            await syncCommissionDetailRows(
                trx,
                existingDetails,
                data.commissionRates,
                async (existingRow, resolvedRow) => {
                    await trx.updateTable('Tbl_SalesTransDtl')
                        .set({
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate
                        })
                        .where('SalesTransDtlID', '=', existingRow.SalesTransDtlID)
                        .execute();
                },
                async (resolvedRow) => {
                    await trx.insertInto('Tbl_SalesTransDtl')
                        .values({
                            SalesTranCode: existingSale.SalesTranCode,
                            DistributionID: resolvedRow.distributionId,
                            PositionName: resolvedRow.positionName,
                            PositionID: resolvedRow.positionId,
                            AgentName: resolvedRow.agentName,
                            AgentID: resolvedRow.agentId,
                            CommissionRate: resolvedRow.commissionRate,
                            WTaxRate: 0,
                            VATRate: 0,
                            Commission: 0
                        })
                        .execute();
                }
            );
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
                Remarks: null,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: data.agentId ? data.agentId : null,
                LastUpdateByWeb: data.userId ? data.userId : null,
                IsRejected: 0
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

export const rejectPendingSale = async (user: { brokerId?: number, agentId?: number }, pendingSalesId: number, approvalStatus: number, salesStatus: string, remarks?: string): QueryResult<any> => {

    // if(agentId == 0){
    //     return {
    //         success: false,
    //         data: {},
    //         error: {
    //             message: 'No user found',
    //             code: 400
    //         }
    //     }
    // }

    try {
        const result = await db.updateTable('Tbl_AgentPendingSales')
            .set({
                ApprovalStatus: approvalStatus || 0,
                SalesStatus: salesStatus || 'REJECTED',
                Remarks: remarks || undefined,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
                LastUpdateby: user.agentId ? user.agentId : null,
                LastUpdateByWeb: user.brokerId ? user.brokerId : null,
                IsRejected: 1
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

export const archiveSale = async (userId: number, salesTranId: number): QueryResult<ITblSalesTrans> => {
    try {
        const result = await db.updateTable('Tbl_SalesTrans')
            .set({
                SalesStatus: SalesStatusText.ARCHIVED,
                LastUpdateby: userId,
                LastUpdate: new TZDate
            })
            .where('SalesTranID', '=', salesTranId)
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
            data: {} as ITblSalesTrans,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const archivePendingSale = async (userId: number, pendingSalesTranId: number): QueryResult<IAgentPendingSale> => {
    try {
        const result = await db.updateTable('Tbl_AgentPendingSales')
            .set({
                SalesStatus: SalesStatusText.ARCHIVED,
                ApprovalStatus: -1,
                LastUpdateByWeb: userId,
                LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
            })
            .where('AgentPendingSalesID', '=', pendingSalesTranId)
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
                LastUpdateByWeb: userWebId,
                Remarks: null,
                LastUpdateby: null
            })
            .outputAll('inserted')
            .where('AgentPendingSalesID', '=', pendingSalesId)
            .executeTakeFirstOrThrow()

        // fetch pending sales details
        const pendingSalesDetails = await trx.selectFrom('Tbl_AgentPendingSalesDtl')
            .selectAll()
            .where('PendingSalesTranCode', '=', updatedPendingSale.PendingSalesTranCode)
            .execute()

        if(pendingSalesDetails.length === 0){
            throw new Error('Pending sale has no detail rows to approve.');
        }

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
                DistributionID: dtl.DistributionID,
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
                FileContent: img.FileContent ? img.FileContent.toString('base64') : '',
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



type DivisionYearlyTotalSort = {
    field: 'Division' | 'Year'
    direction: 'asc' | 'desc'
}

export const getDivisionSalesTotalsYearlyFn = async (sorts?: DivisionYearlyTotalSort[], take?: number, filters?: { startYear?: number, endYear?: number, months?: number[] }) => {
    try {
         const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const whereConditions: any[] = []
        
        if (filters?.startYear !== undefined) {
            whereConditions.push(sql`Year >= ${sql.raw(filters.startYear.toString())}`)
        }
        
        if (filters?.endYear !== undefined) {
            whereConditions.push(sql`Year <= ${sql.raw(filters.endYear.toString())}`)
        }

        // if(filters?.month !== undefined){
        //     whereConditions.push(sql`Month = ${sql.raw(filters.month.toString())}`)
        // }

        if (filters?.months !== undefined && filters.months.length > 0) {
            const monthList = filters.months.join(',');
            whereConditions.push(sql`Month IN (${sql.raw(monthList)})`)
        }
        
        const query = filters && filters.months ? 
            sql`
                SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} *
                FROM vw_DivisionSalesYearMonth
                ${whereConditions.length > 0 ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` : sql``}
                ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
            `
            : sql`
                SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``}
                    Year,
                    Division,
                    NULL as Month,
                    SUM(CurrentMonth) as CurrentMonth,
                    SUM(LastMonth) as LastMonth,
                    SUM(CurrentMonthLastYear) as CurrentMonthLastYear,
                    SUM(CurrentQuarter) as CurrentQuarter,
                    SUM(LastQuarter) as LastQuarter,
                    SUM(LastYear) as LastYear,
                    SUM(CurrentYear) as CurrentYear
                FROM vw_DivisionSalesYearMonth
                ${whereConditions.length > 0 ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` : sql``}
                GROUP BY Year, Division
                ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
            `
        const result = await query.execute(db)
        
        const rows: FnDivisionSalesYearly[] = result.rows as FnDivisionSalesYearly[]
        return {
            success: true,
            data: rows
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as FnDivisionSalesYearly[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

// sales targets

export const getSalesTargets = async (
    filters?: {
        id?: number,
        year?: number,
        divisionIds?: number[],
        divisionNames?: string[],
        entity?: string
    }
): QueryResult<ITblSalesTarget[]> => {
    try {
        let baseQuery = await db.selectFrom('Tbl_SalesTarget')
            .selectAll()

        if(filters && filters?.id){
            baseQuery = baseQuery.where('SalesTargetID', '=', filters.id)
        }

        if(filters && filters?.year){
            baseQuery = baseQuery.where('TargetYear', '=', filters.year)
        }

        if(filters && filters?.divisionIds && filters.divisionIds.length > 0){
            baseQuery = baseQuery.where('TargetNameID', 'in', filters.divisionIds)
        }

        if(filters && filters?.divisionNames && filters.divisionNames.length > 0){
            baseQuery = baseQuery.where('TargetName', 'in', filters.divisionNames)
        }

        if(filters && filters?.entity){
            baseQuery = baseQuery.where('TargetEntity', '=', filters.entity)
        }

        const result = await baseQuery.execute()

        return {
            success: true,
            data: result
        }

    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblSalesTarget[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const addSalesTarget = async (userId: number, salesTarget: ITblSalesTarget): QueryResult<ITblSalesTarget> => {
    try {
        const result = await db.insertInto('Tbl_SalesTarget')
            .values({
                TargetAmount: salesTarget.TargetAmount,
                TargetEntity: salesTarget.TargetEntity,
                TargetName: salesTarget.TargetName,
                TargetNameID: salesTarget.TargetNameID,
                TargetYear: salesTarget.TargetYear,
            })
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
            data: {} as ITblSalesTarget,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editSalesTarget = async (userId: number, id: number, salesTarget: Partial<ITblSalesTarget>): QueryResult<ITblSalesTarget> => {
    try {

        const result = await db.updateTable('Tbl_SalesTarget')
            .set(salesTarget)
            .where('SalesTargetID', '=', id)
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
            data: {} as ITblSalesTarget,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteSalesTarget = async (userId: number, salesTargetId: number): QueryResult<ITblSalesTarget> => {
    try {
        const result = await db.deleteFrom('Tbl_SalesTarget')
            .where('SalesTargetID', '=', salesTargetId)
            .outputAll('deleted')
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
            data: {} as ITblSalesTarget,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const bindImagesToSales = async (images: { id: number, type: string }[], pendingSalesId?: number, salesId?: number): QueryResult<Selectable<TblSalesTranImage>> => {
    try {

        if(!pendingSalesId && !salesId){
            return {
                success: false,
                data: {} as Selectable<TblSalesTranImage>,
                error: {
                    code: 500,
                    message: 'No sales transaction ID provided.'
                }
            }
        }

        let updateData: Insertable<TblSalesTranImage>[] = []

        images.map((data: {id: number, type: string}) => {
            updateData.push({
                SalesTransID: salesId || null,
                PendingSalesTransID: pendingSalesId || 0,
                ImageID: data.id,
                ImageType: data.type
            })
        })

        const result = await db.insertInto('Tbl_SalesTranImage')
            .values(updateData)
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
            data: {} as Selectable<TblSalesTranImage>,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

// Shift levels up (increment) for insert — makes room at the target level
const shiftLevelsUp = async (fromLevel: number, trx: Transaction<DB>) => {
    await trx.updateTable('Tbl_Distribution')
        .set((eb) => ({ Level: eb('Level', '+', 1) }))
        .where('Level', '>=', fromLevel)
        .execute()
}

// Shift levels down (decrement) for delete — closes the gap
const shiftLevelsDown = async (fromLevel: number, trx: Transaction<DB>) => {
    await trx.updateTable('Tbl_Distribution')
        .set((eb) => ({ Level: eb('Level', '-', 1) }))
        .where('Level', '>', fromLevel)
        .execute()
}

export const getDistributionList = async (showInactive: boolean = false): QueryResult<Selectable<TblDistribution>[]> => {
    try {
        let baseQuery = await db.selectFrom('Tbl_Distribution').leftJoin('Tbl_Position', 'Tbl_Distribution.PositionID', 'Tbl_Position.PositionID')

        if(!showInactive){
            baseQuery = baseQuery.where('Tbl_Distribution.IsActive', '=', 1)
        }

        const result = await baseQuery.selectAll('Tbl_Distribution').select('Tbl_Position.Position')
            .orderBy('Level', 'desc')
            .execute()
        
        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as Selectable<TblDistribution>[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getActiveDistributionTemplate = async (): QueryResult<Selectable<TblDistribution>[]> => {
    try {
        const result = await db.selectFrom('Tbl_Distribution')
            .leftJoin('Tbl_Position', 'Tbl_Distribution.PositionID', 'Tbl_Position.PositionID')
            .selectAll('Tbl_Distribution')
            .select('Tbl_Position.Position')
            .where('Tbl_Distribution.IsActive', '=', 1)
            .orderBy('Level', 'asc')
            .execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as Selectable<TblDistribution>[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const addDistributionList = async (data: Insertable<TblDistribution>): QueryResult<Selectable<TblDistribution>> => {
    const trx = await db.startTransaction().execute()
    try {

        await shiftLevelsUp(data.Level, trx)

        const result = await trx.insertInto('Tbl_Distribution')
            .values(data)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()
        
        await trx.commit().execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        await trx.rollback().execute()
        const error = err as Error
        return {
            success: false,
            data: {} as Selectable<TblDistribution>,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editDistributionList = async (distributionId: number, data: Updateable<TblDistribution>): QueryResult<Selectable<TblDistribution>> => {
    const trx = await db.startTransaction().execute()
    try {
        const current = await trx.selectFrom('Tbl_Distribution')
                .selectAll()
                .where('DistributionID', '=', distributionId)
                .executeTakeFirstOrThrow()

        if (data.Level !== undefined && data.Level !== current.Level) {
            if (data.Level > current.Level) {
                // Moving down: shift rows between old+1 and new level UP
                await trx.updateTable('Tbl_Distribution')
                    .set((eb) => ({ Level: eb('Level', '-', 1) }))
                    .where('Level', '>', current.Level)
                    .where('Level', '<=', data.Level as number)
                    .execute()
            } else {
                // Moving up: shift rows between new level and old-1 DOWN
                await trx.updateTable('Tbl_Distribution')
                    .set((eb) => ({ Level: eb('Level', '+', 1) }))
                    .where('Level', '>=', data.Level as number)
                    .where('Level', '<', current.Level)
                    .execute()
            }
        }

        const result = await trx.updateTable('Tbl_Distribution')
                .set(data)
                .where('DistributionID', '=', distributionId)
                .outputAll('inserted')
                .executeTakeFirstOrThrow()

        await trx.commit().execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        await trx.rollback().execute()
        const error = err as Error
        return {
            success: false,
            data: {} as Selectable<TblDistribution>,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteDistributionList = async (
    userId: number,
    id: number
): QueryResult<Selectable<TblDistribution>> => {
    try {
        const result = await db.transaction().execute(async (trx) => {
            const deleted = await trx.updateTable('Tbl_Distribution')
                .set({
                    IsActive: 0,
                    UpdateBy: userId,
                    LastUpdate: new Date()
                })
                .where('DistributionID', '=', id)
                .outputAll('inserted')
                .executeTakeFirstOrThrow()

            return deleted
        })

        return { success: true, data: result }
    } catch (err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as Selectable<TblDistribution>,
            error: { code: 500, message: error.message }
        }
    }
}
