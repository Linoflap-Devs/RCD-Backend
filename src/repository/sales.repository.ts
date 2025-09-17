import { format } from "date-fns";
import { db } from "../db/db"
import { TblAgentPendingSalesDtl, TblSalesBranch, TblSalesSector, VwSalesTransactions } from "../db/db-types"
import { QueryResult } from "../types/global.types"
import { logger } from "../utils/logger"
import { AgentPendingSale, AgentPendingSalesDetail, AgentPendingSalesWithDetails, EditPendingSaleDetail } from "../types/sales.types";

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

export const getPersonalSales = async (agentId: number, filters?: { month?: number }): QueryResult<VwSalesTransactions[]> => {
    try {
        let result = await db.selectFrom('Vw_SalesTransactions')
            .selectAll()
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.month){
            const firstDay = new Date((new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date((new Date).getFullYear(), filters.month, 1)

            result = result.where('DateFiled', '>', firstDay)
            result = result.where('DateFiled', '<', lastDay)
        }

            
        const queryResult = await result.execute()
        
        if(!queryResult){
            throw new Error('No sales found.')
        }

    
        return {
            success: true,
            data: queryResult
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

export const getTotalPersonalSales = async (agentId: number, filters?: { month?: number, year?: number}): QueryResult<number> => {
    try {
        let result = await db.selectFrom('Vw_SalesTransactions')
            .select(({fn, val, ref}) => [
                fn.sum(ref('NetTotalTCP')).as('TotalSales')
            ])
            .where('AgentID', '=', agentId)
            .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.month){
            const firstDay = new Date( filters.year ||(new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date( filters.year ||(new Date).getFullYear(), filters.month, 1)

            result = result.where('DateFiled', '>', firstDay)
            result = result.where('DateFiled', '<', lastDay)
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
        let result = await db.selectFrom('Vw_SalesTransactions')
                .select(({fn, val, ref}) => [
                    fn.sum(ref('NetTotalTCP')).as('TotalSales')
                ])
                .where('DivisionID', '=', divisionId)
                .where('SalesStatus', '<>', 'ARCHIVED')

        if(filters && filters.month){
            const firstDay = new Date( filters.year || (new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date( filters.year || (new Date).getFullYear(), filters.month, 1)

            result = result.where('DateFiled', '>', firstDay)
            result = result.where('DateFiled', '<', lastDay)
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
            const firstDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month, 1)
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
    divisionId: number,
    filters?: {
        month?: number,
        year?: number,
        agentId?: number,
        developerId?: number
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

        let result = await db.selectFrom('Tbl_AgentPendingSales')
            .selectAll()
            .where('DivisionID', '=', divisionId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('ApprovalStatus', 'not in', [0, 3])

        let totalCountResult = await db
            .selectFrom("Tbl_AgentPendingSales")
            .select(({ fn }) => [fn.countAll<number>().as("count")])
            .where('DivisionID', '=', divisionId)
            .where('SalesStatus', '<>', 'ARCHIVED')
            .where('ApprovalStatus', 'not in', [0, 3])


        if(filters && filters.agentId){
            result = result.where('CreatedBy', '=', filters.agentId)
            totalCountResult = totalCountResult.where('CreatedBy', '=', filters.agentId)
        }

        if(filters && filters.month){
            const firstDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month - 1, 1)
            const lastDay = new Date(filters.year ?? (new Date).getFullYear(), filters.month, 1)
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
            .selectAll()
            .where('AgentPendingSalesID', '=', pendingSaleId)
            .executeTakeFirstOrThrow()

        const details = await db.selectFrom('Tbl_AgentPendingSalesDtl')
            .selectAll()
            .where('PendingSalesTranCode', '=', result.PendingSalesTranCode)
            .execute()

        const obj = {
            ...result,
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
                CreatedBy: userId,
                SellerName: data.payment.sellerName,

                LastUpdateby: userId,
                LastUpdate: new Date(),

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

    const agentIds = data.map(d => d.agentId);

    const agents = await db.selectFrom('Vw_Agents')
        .selectAll()
        .where('AgentID', 'in', agentIds)
        .execute()

    const trx = await db.startTransaction().execute();

    try {

        const uniqueAgentIds = [...new Set(data.map(d => d.agentId))];

        const agentMap = new Map(agents.map(agent => [agent.AgentID, agent]));
    
        const missingAgentIds = uniqueAgentIds.filter(id => !agentMap.has(id));

        if (missingAgentIds.length > 0) {
            await trx.rollback().execute();
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

        const updatePromises = data.map(async (item) => {
            const currentAgent = agentMap.get(item.agentId)!; 
        
            return trx.updateTable('Tbl_AgentPendingSalesDtl')
                .set({
                    AgentID: item.agentId,
                    AgentName: `${currentAgent.LastName}, ${currentAgent.FirstName} ${currentAgent.MiddleName ? currentAgent.MiddleName : ''}`,
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