import { VwSalesTransactions } from "../db/db-types";
import { addPendingSale, approvePendingSaleTransaction, editPendingSalesDetails, getDivisionSales, getPendingSaleById, getPendingSales, getSalesBranch, getSalesTransactionDetail, getTotalDivisionSales, getTotalPersonalSales, rejectPendingSale } from "../repository/sales.repository";
import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";
import { getProjectById } from "../repository/projects.repository";
import { AgentPendingSale, EditPendingSaleDetail } from "../types/sales.types";

export const getUserDivisionSalesService = async (userId: number, filters?: {month?: number, year?: number},  pagination?: {page?: number, pageSize?: number}): QueryResult<any> => {

    const agent = await findAgentDetailsByUserId(userId)

    if(!agent.data.AgentID){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No agent found.'
            }
        }
    }

    if(!agent.data.DivisionID){    
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No division found.'
            }
        }
    }

    logger('getUserDivisionSalesService', {userId: userId, agentId: agent.data.AgentID, divisionId: agent.data.DivisionID})
    const result = await getDivisionSales(Number(agent.data.DivisionID), filters, pagination);

    if(!result.success){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No sales found.'
            }
        }
    }


    const sales = result.data.results.map((sale: VwSalesTransactions) => {
        return {
            salesId: sale.SalesTranID,
            salesTransDtlId: sale.SalesTransDtlID,
            projectName: sale.ProjectName,
            projectCode: sale.SalesTranCode,
            agentName: sale.AgentName,
            reservationDate: sale.ReservationDate
        }
    })

    const totalDivisionSales = await getTotalDivisionSales(Number(agent.data.DivisionID), { month: filters?.month, year: filters?.year });

    const obj = {
        totalPages: result.data.totalPages,
        totalSalesAmount: totalDivisionSales.data,
        sales: sales
    }

    return {
        success: true,
        data: obj
    }
}

export const getUserPersonalSalesService = async (userId: number, filters?: { month?: number, year?: number }, pagination?: {page?: number, pageSize?: number}): QueryResult<any> => {
    const agent = await findAgentDetailsByUserId(userId)

    if(!agent.data.AgentID){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No agent found.'
            }
        }
    }

    if(!agent.data.DivisionID){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No division found.'
            }
        }
    }

    logger('getUserDivisionSalesService', {userId: userId, agentId: agent.data.AgentID, divisionId: agent.data.DivisionID})
    const result = await getDivisionSales(Number(agent.data.DivisionID), {agentId: agent.data.AgentID, month: filters?.month, year: filters?.year}, pagination);

    if(!result.success){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No sales found.'
            }
        }
    }


    const sales = result.data.results.map((sale: VwSalesTransactions) => {
        return {
            salesId: sale.SalesTranID,
            salesTransDtlId: sale.SalesTransDtlID,
            projectName: sale.ProjectName?.trim() || '',
            projectCode: sale.SalesTranCode?.trim() || '',
            agentName: sale.AgentName || '',
            reservationDate: sale.ReservationDate
        }
    })

    const totalSalesAmount = await getTotalPersonalSales(agent.data.AgentID, { month: filters?.month, year: filters?.year });

    const obj = {
        totalPages: result.data.totalPages,
        totalSalesAmount: totalSalesAmount.data,
        sales: sales
    }

    return {
        success: true,
        data: obj
    }
}

export const getSalesTransactionDetailService = async (salesTransDtlId: number): QueryResult<any> => {
    const result = await getSalesTransactionDetail(salesTransDtlId);

    if(!result.success){
        return {
            success: false,
            data: {} as VwSalesTransactions,
            error: {
                code: result.error?.code || 500,
                message: 'No sales found.'
            }
        }
    }

    let branchName = undefined
    if(result.data.SalesBranchID){
        const fetchBranch = await getSalesBranch(result.data.SalesBranchID)
        if(fetchBranch.success){
            branchName = fetchBranch.data.BranchName
        }
    }

    const sales = {
        salesInfo: {
            salesStatus: result.data.SalesStatus,
            salesNumber: result.data.SalesTranCode,
            fileDate: result.data.DateFiled,
            reservationDate: result.data.ReservationDate,
            branch: branchName || '',
            sector: '',
            division: result.data.Division,
        },
        propertyInfo: {
            projectName: result.data.ProjectName?.trim() || '',
            projectType: '',
            phase: result.data.Phase || '',
            block: result.data.Block || '',
            lot: result.data.Lot || '',
            lotArea: result.data.LotArea,
            floorArea: result.data.FloorArea,
            developer: result.data.DeveloperName,
            commission: result.data.CommissionRate,
            dasAmount: '',
            miscFee: result.data.MiscFee,
            financingScheme: result.data.FinancingScheme
        },
        buyerInfo: {
            buyerName: result.data.BuyersName,
            address: result.data.BuyersAddress,
            contactNumber: result.data.BuyersContactNumber,
            occupation: result.data.BuyersOccupation,
            downPayment: result.data.DownPayment,
            downPaymentTerms: result.data.DPTerms,
            monthlyPayment: result.data.MonthlyDP,
            downpaymentStartDate: result.data.DPStartSchedule
        }
    }

    return {
        success: true,
        data: sales
    }

}

export const addPendingSalesService = async (
    agentUserId: number,
    data: {
        reservationDate: Date,
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
        }
    }
): QueryResult<any> => {

    const agentData = await findAgentDetailsByUserId(agentUserId)

    if(!agentData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.DivisionID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No division found',
                code: 400
            }
        }
    }

    const project = await getProjectById(data.property.projectID)

    if(!project.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No project found',
                code: 400
            }
        }
    }

    const updatedData = {
        ...data,
        divisionID: Number(agentData.data.DivisionID),
        property: {
            ...data.property,
            developerID: Number(project.data.DeveloperID)
        }
    }

    const result = await addPendingSale(agentData.data.AgentID, updatedData)

    if(!result.success){
        logger('addPendingSalesService', {data: data})
        logger('addPendingSalesService', {error: result.error})
        return {
            success: false,
            data: {},
            error: {
                message: 'Adding sales failed.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const getPendingSalesService = async (
    agentUserId: number,
    filters: {
        month?: number,
        year?: number,
        developerId?: number
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<any> => {
    const agentData = await findAgentDetailsByUserId(agentUserId)

    if(!agentData.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: [],
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    const result = await getPendingSales(
        Number(agentData.data.DivisionID), 
        { 
            ...filters, 
            agentId: agentData.data.Position == 'SALES PERSON' ? Number(agentData.data.AgentID) : undefined
        }, 
        pagination
    )


    if(!result.success){
        logger(result.error?.message || '', {data: filters})
        return {
            success: false,
            data: [],
            error: {
                message: 'Getting pending sales failed.',
                code: 400
            }
        }
    }

    const obj = result.data.results.map((item: AgentPendingSale) => {
        return {
            AgentPendingSalesID: item.AgentPendingSalesID,
            PendingSalesTransCode: item.PendingSalesTranCode,
            SellerName: item.SellerName || 'N/A',
            FinancingScheme: item.FinancingScheme,
            ReservationDate: item.ReservationDate,
            ApprovalStatus: item.ApprovalStatus
        }
    })

    return {
        success: true,
        data: obj
    }
}

export const getPendingSalesDetailService = async (pendingSalesId: number): QueryResult<any> => {

    const result = await getPendingSaleById(pendingSalesId)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editPendingSalesDetailsService = async (
    agentUserId: number,
    pendingSalesId: number,
    data: EditPendingSaleDetail[]
): QueryResult<any> => {

    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 0){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been rejected.',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 2){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been approved by the Unit Manager.',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 3){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been approved by the Sales Director.',
                code: 400
            }
        }
    }

    const agentData = await findAgentDetailsByUserId(agentUserId)

    if(!agentData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    // validate objects
    const validEdits: EditPendingSaleDetail[] = [];
        for (const detail of data) {
            if (!detail.pendingSalesDtlId) return { success: false, data: {}, error: { message: 'Pending Sales Detail ID not found', code: 400 } };
            if (!detail.commissionRate) return { success: false, data: {}, error: { message: 'Commission Rate not found', code: 400 } };
    
            validEdits.push({
                pendingSalesDtlId: detail.pendingSalesDtlId,
                ...(detail.agentId && { agentId: detail.agentId }),
                ...(detail.agentName && { agentName: detail.agentName }),
                commissionRate: detail.commissionRate,
            });
        }

    const result = await editPendingSalesDetails(agentData.data.AgentID, pendingSalesId, validEdits);

    if(!result.success){
        logger('editPendingSalesDetailsService', {data: data})
        logger('editPendingSalesDetailsService', {error: result.error})
        return {
            success: false,
            data: {},
            error: {
                message: 'Editing sales failed.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const rejectPendingSaleService = async ( agentUserId: number, pendingSalesId: number ): QueryResult<any> => {
    const agentData = await findAgentDetailsByUserId(agentUserId)

    if(!agentData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 0){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been rejected.',
                code: 400
            }
        }
    }

    if(agentData.data.Position == 'UNIT MANAGER' && pendingSale.data.ApprovalStatus == 2){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale can only be rejected by the Sales Director.',
                code: 400
            }
        }
    }

    const result = await rejectPendingSale(agentData.data.AgentID, pendingSalesId);

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Rejecting sales failed.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const approvePendingSaleService = async (agentUserId: number, pendingSalesId: number): QueryResult<any> => {

    // validations
    const agentData = await findAgentDetailsByUserId(agentUserId)

    if(!agentData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 3){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been approved.',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 1){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale must be approved by the Unit Manager first.',
                code: 400
            }
        }
    }

    if(pendingSale.data.ApprovalStatus == 0){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been rejected.',
                code: 400
            }
        }
    }

    if(pendingSale.data.DivisionID != agentData.data.DivisionID){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale does not belong to your division.',
                code: 403
            }
        }
    }

    const result = await approvePendingSaleTransaction(agentData.data.AgentID, pendingSalesId);

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Approving sales failed.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}