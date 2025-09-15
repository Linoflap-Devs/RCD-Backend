import { VwSalesTransactions } from "../db/db-types";
import { addPendingSale, getDivisionSales, getSalesBranch, getSalesTransactionDetail, getTotalDivisionSales, getTotalPersonalSales } from "../repository/sales.repository";
import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";
import { getProjectById } from "../repository/projects.repository";

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