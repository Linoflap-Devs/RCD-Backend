import { TblDistribution, VwAgents, VwSalesTrans, VwSalesTransactions } from "../db/db-types";
import { addDistributionList, addPendingSale, addPendingSaleR2, addSalesTarget, approveNextStage, approvePendingSaleTransaction, archivePendingSale, archiveSale, bindImagesToSales, deleteDistributionList, deleteSalesTarget, editDistributionList, editPendingSale, editPendingSaleR2, editPendingSalesDetails, editSaleImages, editSalesTarget, editSalesTransaction, getActiveDistributionTemplate, getDistributionList, getDivisionSales, getDivisionSalesTotalsFn, getDivisionSalesTotalsYearlyFn, getPendingSaleById, getPendingSales, getPendingSalesV2, getPersonalSales, getSaleImagesByTransactionDetail, getSalesBranch, getSalesByDeveloperTotals, getSalesDistributionBySalesTranDtlId, getSalesTargets, getSalesTrans, getSalesTransactionDetail, getSalesTransDetails, getTotalDivisionSales, getTotalPersonalSales, rejectPendingSale } from "../repository/sales.repository";
import { findAgentDetailsByAgentId, findAgentDetailsByUserId, findAgentUserById, findBrokerDetailsByBrokerId, findBrokerDetailsByUserId, findEmployeeUserById } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";
import { getProjectById } from "../repository/projects.repository";
import { AddPendingSaleDetail, AgentPendingSale, AgentPendingSalesDetail, ApproverRole, DivisionYearlySalesGrouped, FnDivisionSalesYearly, IAgentPendingSale, ITblSalesTarget, RoleMap, SalesStatusText, SaleStatus } from "../types/sales.types";
import { IAgent, VwAgentPicture } from "../types/users.types";
import { IImage, IImageBase64, IImageR2, ITypedImageBase64 } from "../types/image.types";
import path from "path";
import { ITblUsersWeb } from "../types/auth.types";
import { ITblProjects, VwProjectDeveloper } from "../types/projects.types";
import { IBrokerEmailPicture } from "../types/brokers.types";
import { getDevelopers } from "../repository/developers.repository";
import { getAgent, getAgents } from "../repository/agents.repository";
import { getDivisions } from "../repository/division.repository";
import { getBrokers } from "../repository/brokers.repository";
import { getPresignedUrl, r2UploadAgreement, r2UploadReceipt } from "../utils/r2";
import { addImage, deleteSaleTranImages, editImage, getSaleTranImages } from "../repository/images.repository";
import { format } from "date-fns";
import { del } from "k6/http";
import { Insertable, Selectable, Updateable } from "kysely";
import { property } from "zod";
import { hasHandsOffBrokerId, isBrokerTransactionDivision } from "../utils/broker-transaction";

const normalizeDistributionValue = (value?: string | null): string => {
    return value?.trim().toUpperCase() || ''
}

type CommissionFilterResult = {
    success: boolean,
    data: AddPendingSaleDetail[],
    error?: {
        code: number,
        message: string
    }
}

const filterCommissionRatesForTransaction = (
    commissionRates: AddPendingSaleDetail[] | undefined,
    divisionID: number | null | undefined
): CommissionFilterResult => {
    const rates = commissionRates || []

    if(isBrokerTransactionDivision(divisionID)){
        const brokerRates = rates.filter(hasHandsOffBrokerId)

        if(brokerRates.length !== 1){
            return {
                success: false,
                data: [],
                error: {
                    code: 400,
                    message: 'Broker Transactions must have exactly one hands-off broker commission rate.'
                }
            }
        }

        return {
            success: true,
            data: brokerRates
        }
    }

    return {
        success: true,
        data: rates.filter(rate => !hasHandsOffBrokerId(rate))
    }
}

const requiresExplicitDivision = (role?: string | null): boolean => {
    return ['BRANCH HEAD', 'BRANCH SALES STAFF', 'SALES ADMIN']
        .includes(normalizeDistributionValue(role))
}

const getActiveDistributionTemplateService = async (): QueryResult<Selectable<TblDistribution>[]> => {
    const result = await getActiveDistributionTemplate()

    if(!result.success){
        return {
            success: false,
            data: [] as Selectable<TblDistribution>[],
            error: {
                code: 500,
                message: 'Failed to get active distribution template.'
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

const buildDistributionTemplateMap = (template: Selectable<TblDistribution>[]) => {
    const templateMap = new Map<string, Selectable<TblDistribution>>()

    for(const row of template){
        const distributionKey = normalizeDistributionValue(row.Distribution)
        const distributionCodeKey = normalizeDistributionValue(row.DistributionCode)

        if(distributionKey){
            templateMap.set(distributionKey, row)
        }

        if(distributionCodeKey){
            templateMap.set(distributionCodeKey, row)
        }
    }

    return templateMap
}

const buildDistributionTemplateIdMap = (template: Selectable<TblDistribution>[]) => {
    return new Map<number, Selectable<TblDistribution>>(
        template
            .filter((row) => row.DistributionID !== null && row.DistributionID !== undefined)
            .map((row) => [Number(row.DistributionID), row])
    )
}

const normalizeCommissionRatesAgainstTemplate = async (
    commissionRates: AddPendingSaleDetail[] | undefined,
    template: Selectable<TblDistribution>[]
): Promise<QueryResult<AddPendingSaleDetail[]>> => {
    const templateMap = buildDistributionTemplateMap(template)
    const templateIdMap = buildDistributionTemplateIdMap(template)
    const invalidPositions = new Set<string>()
    const modifiedCommissionRates: AddPendingSaleDetail[] = []

    for(const commission of commissionRates || []){
        const templateRow = templateIdMap.get(Number(commission.distributionId))
            || templateMap.get(normalizeDistributionValue(commission.distributionCode))

        if(!templateRow){
            invalidPositions.add(
                commission.distributionCode
                || String(commission.distributionId)
            )
            continue
        }

        modifiedCommissionRates.push({
            distributionId: Number(templateRow.DistributionID),
            distributionCode: templateRow.DistributionCode || undefined,
            agentName: commission.agentName || undefined,
            agentId: Number(commission.agentId) || undefined,
            brokerId: Number(commission.brokerId) || undefined,
            commissionRate: Number(commission.commissionRate) || 0
        })
    }

    if(invalidPositions.size > 0){
        return {
            success: false,
            data: [] as AddPendingSaleDetail[],
            error: {
                code: 400,
                message: `Invalid commission position(s): ${Array.from(invalidPositions).join(', ')}`
            }
        }
    }

    for(const commission of modifiedCommissionRates){
        if(commission.agentId || commission.agentName){
            if(normalizeDistributionValue(commission.distributionCode) === 'BR') {
                if(commission.agentName){
                    const findAgent = await getAgents({ name: commission.agentName })

                    if(findAgent.success && findAgent.data.results[0]){
                        commission.agentId = Number(findAgent.data.results[0].AgentID)
                    }
                }

                if(commission.agentId){
                    const agent = await getAgent(Number(commission.agentId))
                    
                    if(agent.success && agent.data){
                        commission.agentName = (`${agent.data.LastName?.trim()}, ${agent.data.FirstName?.trim()} ${agent.data.MiddleName?.trim()}`).trim()
                    }
                }
            }
        }
        if(commission.brokerId){
            const code = templateIdMap.get(Number(commission.distributionId))
            
            if(normalizeDistributionValue(commission.distributionCode) === code?.DistributionCode) {
                const findBroker = await getBrokers({ brokerId: commission.brokerId })

                if(!findBroker.success){
                    console.error(`Failed to find broker with ID ${commission.brokerId}:`, findBroker.error)
                }

                console.log('Broker lookup result for ID', commission.brokerId, findBroker)

                if(findBroker.success && findBroker.data[0]){
                    commission.agentName = findBroker.data[0].RepresentativeName ? findBroker.data[0].RepresentativeName.trim() : undefined
                }

                commission.agentId = findBroker.data[0] ? Number(findBroker.data[0].BrokerID) : undefined
             }
        }
    }

    return {
        success: true,
        data: modifiedCommissionRates
    }
}

const getValidatedCommissionRates = async (
    commissionRates: AddPendingSaleDetail[] | undefined
): Promise<QueryResult<AddPendingSaleDetail[]>> => {
    const activeDistributionTemplate = await getActiveDistributionTemplateService()

    if(!activeDistributionTemplate.success){
        return {
            success: false,
            data: [] as AddPendingSaleDetail[],
            error: {
                code: activeDistributionTemplate.error?.code || 500,
                message: activeDistributionTemplate.error?.message || 'Failed to load commission template.'
            }
        }
    }

    return normalizeCommissionRatesAgainstTemplate(
        commissionRates,
        activeDistributionTemplate.data
    )
}

type CommissionDetailReadRow = {
    AgentID: number | null,
    AgentName: string | null,
    CommissionRate: number | null,
    PositionName: string | null,
    DistributionID?: number | null,
    DivisionID?: number | null,
}

const buildBrokerIdMap = async (details: CommissionDetailReadRow[]): Promise<Map<string, number>> => {
    const brokerNames = Array.from(
        new Set(
            details
                .filter((detail) =>
                    normalizeDistributionValue(detail.PositionName) === 'BROKER'
                    && (!detail.AgentID || detail.AgentID === 0)
                    && detail.AgentName
                )
                .map((detail) => detail.AgentName?.trim() || '')
                .filter((name) => name.length > 0)
        )
    )

    const brokerIdMap = new Map<string, number>()

    await Promise.all(
        brokerNames.map(async (brokerName) => {
            const brokerData = await getBrokers({ name: brokerName })

            if(brokerData.success && brokerData.data[0]?.BrokerID){
                brokerIdMap.set(brokerName, brokerData.data[0].BrokerID)
            }
        })
    )

    return brokerIdMap
}

const mapPendingCommissionDetails = async (details: AgentPendingSalesDetail[], divisionID?: number | null) => {
    const brokerIdMap = await buildBrokerIdMap(details)

    return details.map((detail: AgentPendingSalesDetail) => {
        const positionName = detail.PositionName?.trim() || ''
        const isBrokerTransactionDetail = isBrokerTransactionDivision(divisionID)
        const agentId = isBrokerTransactionDetail || detail.AgentID == 0 || !detail.AgentID ? null : detail.AgentID
        const brokerId = isBrokerTransactionDetail
            ? (detail.AgentID == 0 || !detail.AgentID ? brokerIdMap.get(detail.AgentName?.trim() || '') || null : detail.AgentID)
            : (!agentId && normalizeDistributionValue(positionName) === 'BROKER'
            ? brokerIdMap.get(detail.AgentName?.trim() || '') || null
            : null)

        return {
            ...detail,
            DistributionID: detail.DistributionID ?? null,
            PositionName: positionName,
            AgentID: agentId,
            AgentName: detail.AgentName?.trim() || '',
            BrokerID: brokerId
        }
    })
}

const mapSalesCommissionDetails = async (details: VwSalesTransactions[]) => {
    const brokerIdMap = await buildBrokerIdMap(details)

    return details.map((detail: VwSalesTransactions) => {
        const positionName = detail.PositionName?.trim() || ''
        const isBrokerTransactionDetail = isBrokerTransactionDivision(detail.DivisionID)
        const agentId = isBrokerTransactionDetail || detail.AgentID == 0 || !detail.AgentID ? null : detail.AgentID
        const brokerId = isBrokerTransactionDetail
            ? (detail.AgentID == 0 || !detail.AgentID ? brokerIdMap.get(detail.AgentName?.trim() || '') || null : detail.AgentID)
            : (!agentId && normalizeDistributionValue(positionName) === 'BROKER'
            ? brokerIdMap.get(detail.AgentName?.trim() || '') || null
            : null)

        return {
            SalesTranDtlId: detail.SalesTransDtlID,
            DistributionID: detail.DistributionID ?? null,
            Position: positionName,
            PositionName: positionName,
            AgentID: agentId,
            BrokerID: brokerId,
            AgentName: detail.AgentName?.trim() || '',
            CommissionRate: detail.CommissionRate
        }
    })
}

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
    
    const result = await getDivisionSales(Number(agent.data.DivisionID), { ...filters, isUnique: true}, pagination);

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

    console.log(filters)
    console.log(result.data)

    const sales = result.data.results.map((sale: VwSalesTransactions) => {
        return {
            salesId: sale.SalesTranID,
            salesTransDtlId: sale.SalesTransDtlID,
            projectName: sale.ProjectName,
            projectCode: sale.SalesTranCode,
            agentName: sale.SellerName,
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

    const totalSalesAmount = await getTotalPersonalSales({ agentId: agent.data.AgentID}, { month: filters?.month, year: filters?.year });

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

export const getWebDivisionSalesService = async (userId: number, filters?: { month?: number, year?: number }): QueryResult<any> => {

    const result = await getDivisionSalesTotalsFn(
        [{field: 'Division', direction: 'asc'}], 
        undefined, 
        filters ? new Date(
            filters.year ? filters.year : (new Date()).getFullYear(), 
            filters.month ? filters.month - 1 : new Date().getMonth(), 
            1
        ) : undefined
    );

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

    // add a total object 

    const totals = {
        
    }

    return {
        success: true,
        data: result.data
    }

}   

export const getWebSalesTransService = async (
    userId: number,
    filters?: {
        divisionId?: number,
        month?: number,
        year?: number,
        agentId?: number,
        createdBy?: number,
        developerId?: number,
        isUnique?: boolean,
        salesBranch?: number,
        search?: string,
        showSales?: boolean
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, totalSales: number, results: Partial<VwSalesTrans>[]}> => {

    const userData = await findEmployeeUserById(userId);

    if(!userData.success){
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, totalSales: number, results: Partial<VwSalesTrans>[]},
            error: {
                code: 500,
                message: 'No user found.'
            }
        }
    }

    const result = await getSalesTrans(
        {
            ...filters,
            salesBranch: userData.data.Role != 'SALES ADMIN' ? userData.data.BranchID : undefined,
            search: filters?.search ? filters.search : undefined,
            isUnique: true
        },
        pagination
    );

    if(!result.success){
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, totalSales: number, results: VwSalesTrans[]},
            error: {
                code: 500,
                message: 'No sales found.'
            }
        }
    }
    
    const obj = result.data.results.map((sale: VwSalesTrans) => {
        return {
            SalesTranID: sale.SalesTranID,
            DeveloperName: sale.DeveloperName?.trim() || '',
            Division: sale.Division?.trim() || '',
            DivisionID: sale.DivisionID || 0,
            ProjectName: sale.ProjectName?.trim() || '',
            SalesStatus: sale.SalesStatus?.trim() || '',
            SalesTranCode: sale.SalesTranCode?.trim() || '',
            ReservationDate: sale.ReservationDate,
            NetTotalTCP: sale.NetTotalTCP,
            SellerName: sale.SellerName?.trim() || '',
        }
    })

    return {
        success: true,
        data: {
            totalResults: result.data.totalResults,
            totalPages: result.data.totalPages,
            totalSales: result.data.totalSales,
            results: obj
        }
    }
}

export const getWebSalesTranDtlService = async (userId: number, salesTranId: number) => {

    const userData = await findEmployeeUserById(userId);

    if(!userData.success){
        return {
            success: false,
            data: {} as VwSalesTrans,
            error: {
                code: 500,
                message: 'No user found.'
            }
        }
    }

    const result = await getSalesTransDetails(salesTranId);

     if(!result.success){
        return {
            success: false,
            data: {} as VwSalesTrans,
            error: {
                code: result.error?.code || 500,
                message: 'No sales found.'
            }
        }
     }

    if((userData.data.Role !== 'SALES ADMIN') && (userData.data.BranchID !== result.data[0]?.SalesBranchID)){
        return {
            success: false,
            data: {} as VwSalesTrans,
            error: {
                code: 404,
                message: 'No sales found.'
            }
        }
    }

    let images: IImageBase64[] = []
    if(result.data && result.data[0].SalesTransDtlID){
        const data = await getSaleImagesByTransactionDetail(result.data[0].SalesTransDtlID);

        if(data.success){
            images = data.data
        }
    }
    else {
        return {
            success: false,
            data: {} as VwSalesTransactions,
            error: {
                code: 404,
                message: 'No sales found.'
            }
        }
    }

    const details = await mapSalesCommissionDetails(result.data)

    const data = result.data[0]

    let updatedByName = ''
    if(data.LastUpdateby){
        const response = await findEmployeeUserById(data.LastUpdateby)
        updatedByName = response.success ? response.data.EmpName : ''
    }
    

    const obj = {
        SalesTransId: data.SalesTranID,
        SalesTranCode: data.SalesTranCode,
        DivisionID: data.DivisionID,
        DateFiled: data.DateFiled,
        ReservationDate: data.ReservationDate,
        BuyersName: data.BuyersName,
        BuyersAddress: data.BuyersAddress,
        BuyersOccupation: data.BuyersOccupation,
        BuyersContactNumber: data.BuyersContactNumber,
        ProjectID: data.ProjectID,
        ProjectLocationID: data.ProjectLocationID,
        DeveloperID: data.DeveloperID,
        FinancingScheme: data.FinancingScheme,
        Block: data.Block,
        Lot: data.Lot,
        Phase: data.Phase,
        LotArea: data.LotArea,
        FloorArea: data.FloorArea,
        NetTotalTCP: data.NetTotalTCP,
        MiscFee: data.MiscFee,
        DownPayment: data.DownPayment,
        MonthlyDP: data.MonthlyDP,
        DPStartSchedule: data.DPStartSchedule,
        DPTerms: data.DPTerms,
        SalesStatus: data.SalesStatus,
        LastUpdateby: updatedByName,
        LastUpdate: data.LastUpdate,
        SalesBranchID: data.SalesBranchID,
        DevCommType: data.DevCommType,
        ProjectName: data.ProjectName,
        DeveloperName: data.DeveloperName,
        Division: data.Division,
        SalesSectorID: data.SalesSectorID,
        SectorName: data.SectorName,
        ProjectTypeName: data.ProjectTypeName,
        SellerName: data.SellerName?.trim() || '',
    }

    return {
        success: true,
        data: {
            ...obj,
            Details: details,
            Images: images
        }
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

    const images = await getSaleImagesByTransactionDetail(salesTransDtlId);
    const details = await getSalesDistributionBySalesTranDtlId(salesTransDtlId)

    let branchName = undefined
    if(result.data.SalesBranchID){
        const fetchBranch = await getSalesBranch(result.data.SalesBranchID)
        if(fetchBranch.success){
            branchName = fetchBranch.data.BranchName
        }
    }

    const detailsNew = await mapSalesCommissionDetails(details.data)

    let updatedByName = ''
    if(details.data[0].LastUpdateby){
        const response = await findEmployeeUserById(details.data[0].LastUpdateby)
        updatedByName = response.success ? response.data.EmpName : ''
    }

    const sales = {
        salesInfo: {
            salesStatus: result.data.SalesStatus,
            salesNumber: result.data.SalesTranCode,
            fileDate: result.data.DateFiled,
            reservationDate: result.data.ReservationDate,
            branch: branchName || '',
            sector: result.data.SectorName || '',
            division: result.data.Division,
            agentName: result.data.AgentName,
            agentCommission: result.data.CommissionRate,
            sellerName: result.data.SellerName || ''
        },
        propertyInfo: {
            projectName: result.data.ProjectName?.trim() || '',
            projectType: result.data.ProjectTypeName ? result.data.ProjectTypeName.trim() : '',
            phase: result.data.Phase || '',
            block: result.data.Block || '',
            lot: result.data.Lot || '',
            lotArea: result.data.LotArea,
            floorArea: result.data.FloorArea,
            developer: result.data.DeveloperName,
            commission: result.data.DevCommType,
            dasAmount: result.data.NetTotalTCP,
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
        },
        lastUpdatedBy: updatedByName,
        lastUpdatedAt: result.data.LastUpdate,
        details: detailsNew,
        images: images.data
    }

    return {
        success: true,
        data: sales
    }

}

export const addPendingSalesService = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    data: {
        reservationDate: Date,
        salesBranchID: number,
        sectorID: number, 
        divisionID?: number,
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
            developerCommission?: number,
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
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: AddPendingSaleDetail[]
    }
): QueryResult<any> => {

    console.log("commrates", data.commissionRates)
    console.log(data.property)

    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }

    if(user.agentUserId && user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'Cannot submit both agent and web user.',
                code: 400
            }
        }
    }
    
    let mobileAgentData: VwAgentPicture = {} as VwAgentPicture
    let webAgentData: ITblUsersWeb = {} as ITblUsersWeb
    let role = ''
    let assignedUM = undefined

    if(user.agentUserId){
        const agentData = await findAgentDetailsByUserId(user.agentUserId)
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

        if(isBrokerTransactionDivision(data.divisionID)){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Only Sales Admin can add Broker Transactions.',
                    code: 403
                }
            }
        }
        
        role = agentData.data.Position || ''
        mobileAgentData = agentData.data
        user.agentUserId = agentData.data.AgentID

        if(agentData.data.Position !== 'SALES PERSON' && !data.commissionRates){
            console.log(agentData.data.Position)
            console.log(data.commissionRates)
            return {
                success: false,
                data: {},
                error: {
                    message: 'Commission rates are required for this user (Unit Manager / Sales Director).',
                    code: 400
                }
            }
        }

        console.log("agentData", agentData)

        if(agentData.data.ReferredByID){
            assignedUM = agentData.data.ReferredByID
        }

        if(agentData.data.Position == 'UNIT MANAGER'){
            assignedUM = agentData.data.AgentID
        }
    }

    else if(user.webUserId) {
        const webUserData = await findEmployeeUserById(user.webUserId)

        if(!webUserData.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        if(!webUserData.data.UserWebID){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        if(data.divisionID === undefined && requiresExplicitDivision(webUserData.data.Role)){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Division is required for Branch Head and Sales Admin users.',
                    code: 400
                }
            }
        }

        if(isBrokerTransactionDivision(data.divisionID) && webUserData.data.Role !== 'SALES ADMIN'){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Only Sales Admin can add Broker Transactions.',
                    code: 403
                }
            }
        }

        if(!data.images?.receipt){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Receipt images are required.',
                    code: 400
                }
            }
        }

        if(!data.commissionRates || data.commissionRates.length === 0){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Commission rates are required.',
                    code: 400
                }
            }
        }

        role = webUserData.data.Role
        webAgentData = webUserData.data
        user.webUserId = webUserData.data.UserWebID
    }

    else {
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }
    

    const project = await getProjectById(data.property.projectID)

    if(!project.success){
        console.log(project)
        return {
            success: false,
            data: {},
            error: {
                message: 'No project found',
                code: 400
            }
        }
    }

    let receiptMetadata: IImage | undefined = undefined;
    let receipt = data.images?.receipt;
    if(receipt){
        receiptMetadata = {
            FileName: receipt.originalname,
            ContentType: receipt.mimetype,
            FileExt: path.extname(receipt.originalname),
            FileSize: receipt.size,
            FileContent: receipt.buffer
        }
    }

    let agreementMetadata: IImage | undefined = undefined; 
    let agreement = data.images?.agreement;
    if(agreement){
        agreementMetadata = {
            FileName: agreement.originalname,
            ContentType: agreement.mimetype,
            FileExt: path.extname(agreement.originalname),
            FileSize: agreement.size,
            FileContent: agreement.buffer
        }
    }

    if(!data.property.developerCommission) {
        const developer = await getDevelopers({ developerId: Number(project.data.DeveloperID) })

        if(!developer.success || developer.data.data.length == 0){
            return {
                success: false,
                data: {} as ITblProjects,
                error: {
                    code: 404,
                    message: 'Invalid developer id.'
                }
            }
        }

        data.property.developerCommission = developer.data.data[0].CommRate
    }

    const effectiveDivID = data.divisionID ?? Number(mobileAgentData.DivisionID)

    if(!Number.isFinite(effectiveDivID)){
        return {
            success: false,
            data: {},
            error: {
                message: 'Division is required.',
                code: 400
            }
        }
    }

    const filteredCommissions = filterCommissionRatesForTransaction(data.commissionRates, effectiveDivID)

    if(!filteredCommissions.success){
        return {
            success: false,
            data: {},
            error: filteredCommissions.error
        }
    }

    data.commissionRates = filteredCommissions.data

    const normalizedCommissions = await getValidatedCommissionRates(data.commissionRates)

    if(!normalizedCommissions.success){
        return {
            success: false,
            data: {},
            error: {
                message: normalizedCommissions.error?.message || 'Invalid commission rates.',
                code: normalizedCommissions.error?.code || 400
            }
        }
    }

    const validCommissions = normalizedCommissions.data

    if(role !== 'SALES PERSON' && validCommissions.length === 0){
        return {
            success: false,
            data: {},
            error: {
                message: 'At least one commission rate is required.',
                code: 400
            }
        }
    }

    

    const updatedData = {
        ...data,
        assignedUM: assignedUM || undefined,
        divisionID: data.divisionID ?? Number(mobileAgentData.DivisionID),
        property: {
            ...data.property,
            developerID: Number(project.data.DeveloperID),
            developerCommission: Number(data.property.developerCommission)
        },
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        commissionRates: validCommissions || []
    }

    const result = await addPendingSale(
        {
            agentUserId: user.agentUserId,
            webUserId: user.webUserId
        }, 
        role, 
        updatedData
    )

    if(!result.success){
        //logger('addPendingSalesService', {data: data})
        logger('addPendingSalesService', {error: result.error})
        console.log(result.error)
        return {
            success: false,
            data: {},
            error: {
                message: 'Adding sales failed.',
                code: 400
            }
        }
    }

    console.log(result.success, webAgentData.Role)

    if(webAgentData && webAgentData.Role === 'SALES ADMIN' && result.success){
        console.log('starting approval')
        const approval = await approvePendingSaleTransaction(webAgentData.UserWebID, result.data.AgentPendingSalesID)

        console.log(approval)
    }

    return {
        success: true,
        data: result.data
    }
}

export const addPendingSalesServiceR2 = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    data: {
        reservationDate: Date,
        salesBranchID: number,
        sectorID: number, 
        divisionID?: number,
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
            developerCommission?: number,
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
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: AddPendingSaleDetail[]
    }
): QueryResult<any> => {

    console.log("commrates", data.commissionRates)

    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }

    if(user.agentUserId && user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'Cannot submit both agent and web user.',
                code: 400
            }
        }
    }
    
    let mobileAgentData: VwAgentPicture = {} as VwAgentPicture
    let webAgentData: ITblUsersWeb = {} as ITblUsersWeb
    let role = ''
    let assignedUM = undefined

    if(user.agentUserId){
        const agentData = await findAgentDetailsByUserId(user.agentUserId)
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

        if(isBrokerTransactionDivision(data.divisionID)){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Only Sales Admin can add Broker Transactions.',
                    code: 403
                }
            }
        }
        
        role = agentData.data.Position || ''
        mobileAgentData = agentData.data
        user.agentUserId = agentData.data.AgentID

        if(agentData.data.Position !== 'SALES PERSON' && !data.commissionRates){
            console.log(agentData.data.Position)
            console.log(data.commissionRates)
            return {
                success: false,
                data: {},
                error: {
                    message: 'Commission rates are required for this user (Unit Manager / Sales Director).',
                    code: 400
                }
            }
        }

        if(agentData.data.ReferredByID){
            assignedUM = agentData.data.ReferredByID
        }

        if(agentData.data.Position == 'UNIT MANAGER'){
            assignedUM = agentData.data.AgentID
        }
    }

    else if(user.webUserId) {
        const webUserData = await findEmployeeUserById(user.webUserId)

        if(!webUserData.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        if(!webUserData.data.UserWebID){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        if(data.divisionID === undefined && requiresExplicitDivision(webUserData.data.Role)){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Division is required for Branch Head and Sales Admin users.',
                    code: 400
                }
            }
        }

        if(isBrokerTransactionDivision(data.divisionID) && webUserData.data.Role !== 'SALES ADMIN'){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Only Sales Admin can add Broker Transactions.',
                    code: 403
                }
            }
        }

        if(!data.images?.receipt){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Receipt images are required.',
                    code: 400
                }
            }
        }

        if(!data.commissionRates || data.commissionRates.length === 0){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Commission rates are required.',
                    code: 400
                }
            }
        }

        role = webUserData.data.Role
        webAgentData = webUserData.data
        user.webUserId = webUserData.data.UserWebID
    }

    else {
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
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

    if(!data.property.developerCommission) {
        const developer = await getDevelopers({ developerId: Number(project.data.DeveloperID) })

        if(!developer.success || developer.data.data.length == 0){
            return {
                success: false,
                data: {} as ITblProjects,
                error: {
                    code: 404,
                    message: 'Invalid developer id.'
                }
            }
        }

        data.property.developerCommission = developer.data.data[0].CommRate
    }

    const effectiveDivID = data.divisionID ?? Number(mobileAgentData.DivisionID)

    if(!Number.isFinite(effectiveDivID)){
        return {
            success: false,
            data: {},
            error: {
                message: 'Division is required.',
                code: 400
            }
        }
    }

    const filteredCommissions = filterCommissionRatesForTransaction(data.commissionRates, effectiveDivID)

    if(!filteredCommissions.success){
        return {
            success: false,
            data: {},
            error: filteredCommissions.error
        }
    }

    data.commissionRates = filteredCommissions.data

    const normalizedCommissions = await getValidatedCommissionRates(data.commissionRates)

    if(!normalizedCommissions.success){
        return {
            success: false,
            data: {},
            error: {
                message: normalizedCommissions.error?.message || 'Invalid commission rates.',
                code: normalizedCommissions.error?.code || 400
            }
        }
    }

    const validCommissions = normalizedCommissions.data

    if(role !== 'SALES PERSON' && validCommissions.length === 0){
        return {
            success: false,
            data: {},
            error: {
                message: 'At least one commission rate is required.',
                code: 400
            }
        }
    }

    

    const updatedData = {
        ...data,
        assignedUM: assignedUM || undefined,
        divisionID: data.divisionID ?? Number(mobileAgentData.DivisionID),
        property: {
            ...data.property,
            developerID: Number(project.data.DeveloperID),
            developerCommission: Number(data.property.developerCommission)
        },
        commissionRates: validCommissions || []
    }

    const result = await addPendingSaleR2(
        {
            agentUserId: user.agentUserId,
            webUserId: user.webUserId
        }, 
        role, 
        updatedData
    )

    if(!result.success){
        //logger('addPendingSalesService', {data: data})
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

    console.log(result.success, webAgentData.Role)

    // upload images

    
    const imageIds: {id: number, type: string}[] = []

    if( data.images && data.images.receipt){
        console.log('receipt')
        const receipt = data.images.receipt;
        const receiptMetadata: IImageR2 = {
            FileName: `${result.data.PendingSalesTranCode}-receipt_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
            ContentType: receipt.mimetype,
            FileExt: path.extname(receipt.originalname),
            FileSize: receipt.size,
            FileContent: null,
            StorageKey: null
        }
        const addDBImage = await addImage(receiptMetadata)

        console.log(addDBImage)
        
        const r2Upload = await r2UploadReceipt(result.data.PendingSalesTranCode, data.images.receipt)

        console.log(r2Upload)

        const updateStorageKey = await editImage(addDBImage.data.ImageID, { StorageKey: r2Upload.data.storageKey } as IImage)

        imageIds.push({id: addDBImage.data.ImageID, type: 'receipt'})

    }

    if( data.images && data.images.agreement){

        const agreement = data.images.agreement
        let agreementMetadata: IImageR2 = {
            FileName: `${result.data.PendingSalesTranCode}-agreement_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
            ContentType: agreement.mimetype,
            FileExt: path.extname(agreement.originalname),
            FileSize: agreement.size,
            FileContent: null,
            StorageKey: null
        }

        const addDBImage = await addImage(agreementMetadata)

        const r2Upload = await r2UploadAgreement(result.data.PendingSalesTranCode, data.images.agreement)

        const updateStorageKey = await editImage(addDBImage.data.ImageID, { StorageKey: r2Upload.data.storageKey } as IImage)

        imageIds.push({id: addDBImage.data.ImageID, type: 'agreement'})
    }

    // bind images to sales
    if(imageIds.length > 0){
        const bindImages = await bindImagesToSales(imageIds, result.data.AgentPendingSalesID, undefined)
    }

    if(webAgentData && webAgentData.Role === 'SALES ADMIN' && result.success){
        console.log('starting approval')
        const approval = await approvePendingSaleTransaction(webAgentData.UserWebID, result.data.AgentPendingSalesID)

        console.log(approval)
    }

    return {
        success: true,
        data: result.data
    }
}

export const assignUMToPendingSaleService = async (
    userId: number,
    pendingSaleId: number,
    unitManagerId: number
): QueryResult<IAgentPendingSale> => {


    // verify user
    const salesDirector = await findAgentDetailsByUserId(userId)

    if(!salesDirector.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!salesDirector.data.AgentID){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No user found.',
                code: 400
            }
        }
    }

    const unitManager = await findAgentDetailsByAgentId(unitManagerId)

    if(!unitManager.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(unitManager.data.Position !== 'UNIT MANAGER'){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'User is not a unit manager.',
                code: 400
            }
        }
    }

    const transactionDetails = await getPendingSaleById(pendingSaleId)

    if(!transactionDetails.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No transaction found',
                code: 400
            }
        }
    }

    if(transactionDetails.data.AssignedUM){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'Unit manager already assigned.',
                code: 400
            }
        }
    }

    const result = await editPendingSale({ agentUserId: salesDirector.data.AgentID }, "", pendingSaleId, { assignedUM: unitManagerId })

    if(!result.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'Assigning unit manager failed.',
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

    if(!agentData.data.DivisionID){
        return {
            success: false,
            data: [],
            error: {
                message: 'No division found',
                code: 403
            }
        }
    }

    let assignedUMFilter = undefined

    if(agentData.data.Position == 'UNIT MANAGER'){
        assignedUMFilter = Number(agentData.data.AgentID)
    }
    else if(agentData.data.Position == 'SALES DIRECTOR'){
        assignedUMFilter = null
    }
    else {
        assignedUMFilter = undefined
    }

    const result = await getPendingSales(
        Number(agentData.data.DivisionID), 
        { 
            ...filters, 
            agentId: agentData.data.Position == 'SALES PERSON' ? Number(agentData.data.AgentID) : undefined,
            approvalStatus: [1,2],
            assignedUM: assignedUMFilter,
            isUnique: true
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

    let obj = result.data.results.map((item: AgentPendingSale) => {
        return {
            AgentPendingSalesID: item.AgentPendingSalesID,
            PendingSalesTransCode: item.PendingSalesTranCode,
            SellerName: item.SellerName || 'N/A',
            FinancingScheme: item.FinancingScheme,
            ReservationDate: item.ReservationDate,
            DateFiled: item.DateFiled,
            ApprovalStatus: item.ApprovalStatus,
            HasRemark: item.Remarks ? true : false,
            IsRejected: item.IsRejected,
            CreatedBy: item.CreatedBy,
            CreatedByWeb: item.CreatedByWeb,
            CreatedByName: (item.CreatedByName || item.CreatedByWebName || '').trim(),
            CreatedByRole: (item.CreatorAgentPosition || item.CreatorEmployeePosition || '').trim(),
            AssignedUM: item.AssignedUM
        }
    })

    if(agentData.data.Position == 'SALES DIRECTOR'){
        const sdResult = await getPendingSales(
            Number(agentData.data.DivisionID), 
            { 
                ...filters, 
                approvalStatus: [2],
                isUnique: true
            }, 
            pagination
        )

        let sdObj = sdResult.data.results.map((item: AgentPendingSale) => {
            return {
                AgentPendingSalesID: item.AgentPendingSalesID,
                PendingSalesTransCode: item.PendingSalesTranCode,
                SellerName: item.SellerName || 'N/A',
                FinancingScheme: item.FinancingScheme,
                ReservationDate: item.ReservationDate,
                DateFiled: item.DateFiled,
                ApprovalStatus: item.ApprovalStatus,
                HasRemark: item.Remarks ? true : false,
                IsRejected: item.IsRejected,
                CreatedBy: item.CreatedBy,
                CreatedByWeb: item.CreatedByWeb,
                CreatedByName: (item.CreatedByName || item.CreatedByWebName || '').trim(),
                CreatedByRole: (item.CreatorAgentPosition || item.CreatorEmployeePosition || '').trim(),
                AssignedUM: item.AssignedUM
            }
        })

        obj.push(...sdObj)
    }   

    // sort by reservation date
    obj.sort((a: any, b: any) => {
        return new Date(b.ReservationDate).getTime() - new Date(a.ReservationDate).getTime()
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

    let resultCopy = { ...result.data }
    if (result.data.Images && result.data.Images.length > 0) {
        const imageCopies = result.data.Images
        const images: (ITypedImageBase64 & { URL: string })[] = await Promise.all(
            imageCopies.map(async (img: ITypedImageBase64) => {
                const url = img.StorageKey ? (await getPresignedUrl(img.StorageKey)).data : await Promise.resolve('')
                return {
                    ...img,
                    URL: url
                }
            })
        )
        resultCopy = { ...result.data, Images: images }
    }
    const detailsArray = await mapPendingCommissionDetails(result.data.Details, result.data.DivisionID)


    let updatedByName = ''
    if(result.data.LastUpdateby){
        console.log(result.data.LastUpdateby)
        const response = await findAgentDetailsByAgentId(result.data.LastUpdateby)
        console.log(response)
        updatedByName = response.success ? response.data.AgentName ? response.data.AgentName : '' : ''
    }
    else if (result.data.LastUpdateByWeb){
        console.log(result.data.LastUpdateByWeb)
        const lastUpdatedByEmployee = await findEmployeeUserById(result.data.LastUpdateByWeb)
        console.log(lastUpdatedByEmployee)
        if(lastUpdatedByEmployee.success && lastUpdatedByEmployee.data.UserWebID){
            updatedByName = lastUpdatedByEmployee.data.EmpName ? lastUpdatedByEmployee.data.EmpName : ''
        }
    }

    const obj = {
        ...resultCopy,
        Details: detailsArray,
        LastUpdateby: updatedByName,
        LastUpdateId: result.data.LastUpdateby
    }

    return {
        success: true,
        data: obj
    }
}

export const getCombinedPersonalSalesService = async (
    user: {
        agentUserId?: number,
        brokerUserId?: number
    }, 
    userPosition: string,
    filters?: { month?: number, year?: number }, 
    pagination?: { page?: number, pageSize?: number }
): QueryResult<any> => {
    console.log("service", user)
    try {

        let agent: VwAgentPicture | undefined = undefined
        let broker: IBrokerEmailPicture | undefined = undefined

        let approvalStatusRoleMap: Map<string, number> = new Map([
            ['SALES PERSON', 1],
            ['UNIT MANAGER', 1],
            ['SALES DIRECTOR', 2],
            ['BRANCH SALES STAFF', 3],
            ['SALES ADMIN', 4],
        ])

        if(user.agentUserId){
            const agentData = await findAgentDetailsByUserId(user.agentUserId);
        
            if (!agentData.data.AgentID) {
                return {
                    success: false,
                    data: [],
                    error: {
                        code: 500,
                        message: 'No agent found.'
                    }
                };
            }

            if (!agentData.data.DivisionID) {
                return {
                    success: false,
                    data: [],
                    error: {
                        code: 500,
                        message: 'No division found.'
                    }
                };
            }

            agent = agentData.data
        }

        if(user.brokerUserId){
            if(userPosition.toLowerCase().includes('hands-off')){
                const brokerData = await findBrokerDetailsByUserId(user.brokerUserId);
    
                if(!brokerData.data.BrokerID){
                    return {
                        success: false,
                        data: [],
                        error: {
                            code: 500,
                            message: 'No broker found.'
                        }
                    }
                }
    
                broker = brokerData.data
            }

            else {
                const agentData = await findAgentDetailsByUserId(user.brokerUserId);
        
                if (!agentData.data.AgentID) {
                    return {
                        success: false,
                        data: [],
                        error: {
                            code: 500,
                            message: 'No agent found.'
                        }
                    };
                }

                agent = agentData.data
            }
        }

        console.log(agent?.Position)
        
        // Get both approved and pending sales
        const [approvedSalesResult, pendingSalesResult, sdApprovedSales] = await Promise.all([
            // Get approved sales using existing function or create similar one
            getPersonalSales(
                {
                    agentId: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                    brokerName: broker ? broker.RepresentativeName : undefined,
                }, 
                filters
            ),
            // Get pending sales (self-submitted)
            getPendingSales(
                undefined,
                {
                    ...filters,
                    //agentId: agent?.Position?.toLowerCase().includes('sales person') ? agent ? agent.AgentID ? agent.AgentID : undefined : undefined : undefined,
                    //agentId: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                    createdBy: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                    brokerName: broker ? broker.RepresentativeName : undefined,
                    isUnique: true,
                    showRejected: true,
                }
            ),
             // Get sd approved sales (excluding self-submitted)
            getPendingSales(
                undefined,
                {
                    ...filters,
                    agentId: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                    brokerName: broker ? broker.RepresentativeName : undefined,
                    approvalStatus: [3,4],
                    isUnique: true
                }
            )               
        ]);


        // let otherPendingSales: {totalPages: number, results: AgentPendingSale[]} = {totalPages: 0, results: []}

        // // get sales to be approved by the user
        // if(!broker && (agent && agent.Position?.toLowerCase() !== 'sales person')){

        //     const pos = agent && agent.Position ? agent.Position?.toUpperCase() : '';

        //     const otherPendingSalesResult = await getPendingSales(
        //         agent ? agent.DivisionID ? Number(agent.DivisionID) : 0 : 0,
        //         {
        //             ...filters,
        //             approvalStatus: approvalStatusRoleMap.get(pos) ? [approvalStatusRoleMap.get(pos) || 0] : [0],
        //             excAgentId: agent ? agent.AgentID ? Number(agent.AgentID) : 0 : 0,
        //             isUnique: true
        //         }
        //     )

        //     if(otherPendingSalesResult.success){
        //         console.log("otherPendingSalesResult length", otherPendingSalesResult.data.results.length)
        //         console.log("otherPendingSalesResult 1", otherPendingSalesResult.data.results[0])
        //         console.log("otherPendingSalesResult 2", otherPendingSalesResult.data.results[0])
        //         console.log("otherPendingSalesResult 3", otherPendingSalesResult.data.results[0])
        //         otherPendingSales = otherPendingSalesResult.data
        //     }
        // }

        console.log("filters", filters)
        console.log("agentId", agent ? agent.AgentID ? agent.AgentID : undefined : undefined)
        console.log("brokerName", broker ? broker.RepresentativeName : undefined)

        //console.log(pendingSalesResult.data)
        

        let combinedSales: any[] = [];

        let approvedTrans: any[] = []
        let selfPendingSales: any[] = []
        let othersPendingSales: any[] = []
        let sdApprovedSalesArr: any[] = []

        // Map to track division totals
        const divisionTotalsMap = new Map<number, { 
            divisionId: number, 
            divisionName: string, 
            totalSalesAmount: number 
        }>();

        // Process approved sales
        if (approvedSalesResult.success) {
            const approvedSales = approvedSalesResult.data.results.map((sale: VwSalesTransactions) => {

                if (sale.DivisionID && sale.NetTotalTCP) {
                    const existing = divisionTotalsMap.get(sale.DivisionID);
                    if (existing) {
                        existing.totalSalesAmount += sale.NetTotalTCP;
                    } else {
                        divisionTotalsMap.set(sale.DivisionID, {
                            divisionId: sale.DivisionID,
                            divisionName: sale.Division || '',
                            totalSalesAmount: sale.NetTotalTCP
                        });
                    }
                }

                return {
                    salesId: sale.SalesTranID,
                    salesTransDtlId: sale.SalesTransDtlID,
                    pendingSalesId: null,
                    pendingSalesDtlId: null,
                    projectName: sale.ProjectName?.trim() || '',
                    projectCode: sale.SalesTranCode?.trim() || '',
                    // agentName: sale.AgentName || '',
                    agentName: sale.SellerName || sale.AgentName || '',
                    divisionName: sale.Division,
                    divisionId: sale.DivisionID,
                    reservationDate: sale.ReservationDate,
                    dateFiled: sale.DateFiled,
                    approvalStatus: null,
                    hasRemarks: false,
                    isEditable: false,
                    isRejected: false,
                    hasAssignedUM: true,
                    //source: 'approved'
                }
            });
            approvedTrans.push(...approvedSales);
            combinedSales.push(...approvedSales);
        }

        // Process pending sales
        //console.log(pendingSalesResult.data)
        if (pendingSalesResult.success) {
            const pendingSales = pendingSalesResult.data.results.map((sale: AgentPendingSale) => {

                let agentRole = agent ? agent.Position : undefined

                const role = RoleMap.get((agent?.Position || 'BROKER').toUpperCase()) || 0

                const isSubmitter = role !== 0 && agent?.AgentID === (sale.CreatedBy)

                return {
                    salesId: null,
                    salesTransDtlId: null,
                    pendingSalesId: sale.AgentPendingSalesID,
                    pendingSalesDtlId: null,
                    projectName: sale.ProjectName?.trim() || '',
                    projectCode: sale.PendingSalesTranCode?.trim() || '',
                    // agentName: sale.AgentName || sale.CreatedByName || '',
                    agentName: sale.SellerName || sale.AgentName || sale.CreatedBy || '',
                    divisionId: sale.DivisionID,
                    divisionName: sale.Division,
                    reservationDate: sale.ReservationDate,
                    dateFiled: sale.DateFiled,
                    approvalStatus: sale.ApprovalStatus,
                    hasRemarks: sale.Remarks ? true : false,
                    isEditable: isSubmitter ? role == sale.ApprovalStatus : role == (sale.ApprovalStatus + 1),
                    isRejected: sale.IsRejected ? true : false,
                    hasAssignedUM: sale.AssignedUM ? true : false,
                    //source: 'pending'
                }
            });
            selfPendingSales.push(...pendingSales);
            combinedSales.push(...pendingSales);
        }

        if (sdApprovedSales.success) {

            const pendingSalesIds = pendingSalesResult.success ? pendingSalesResult.data.results.map((sale: AgentPendingSale) => sale.AgentPendingSalesID) : []

            // exclude self-submitted sales
            const filteredSdApprovedSales = sdApprovedSales.data.results.filter((sale: AgentPendingSale) => !pendingSalesIds.includes(sale.AgentPendingSalesID));

            const pendingSales = filteredSdApprovedSales.map((sale: AgentPendingSale) => {

                let agentRole = agent ? agent.Position : undefined

                const role = RoleMap.get((agent?.Position || 'BROKER').toUpperCase()) || 0

                const isSubmitter = role !== 0 && agent?.AgentID === (sale.CreatedBy)

                return {
                    salesId: null,
                    salesTransDtlId: null,
                    pendingSalesId: sale.AgentPendingSalesID,
                    pendingSalesDtlId: null,
                    projectName: sale.ProjectName?.trim() || '',
                    projectCode: sale.PendingSalesTranCode?.trim() || '',
                    // agentName: sale.AgentName || sale.CreatedByName || '',
                    agentName: sale.SellerName || sale.AgentName || sale.CreatedBy || '',
                    divisionId: sale.DivisionID,
                    divisionName: sale.Division,
                    reservationDate: sale.ReservationDate,
                    dateFiled: sale.DateFiled,
                    approvalStatus: sale.ApprovalStatus,
                    hasRemarks: sale.Remarks ? true : false,
                    isEditable: false,
                    isRejected: sale.IsRejected ? true : false,
                    hasAssignedUM: sale.AssignedUM ? true : false,
                    //source: 'sdApproved'
                }
            });
            sdApprovedSalesArr.push(...pendingSales);
            combinedSales.push(...pendingSales);
        }

        // if (otherPendingSales.results.length > 0) {

        //     let sampleArr = []

        //     const pendingSales = otherPendingSales.results.map((sale: AgentPendingSale) => {

        //         let agentRole = agent ? agent.Position : undefined

        //         const role = RoleMap.get((agent?.Position || 'BROKER').toUpperCase()) || 0

        //         const isSubmitter = role !== 0 && agent?.AgentID === (sale.CreatedBy)

        //         return {
        //             salesId: null,
        //             salesTransDtlId: null,
        //             pendingSalesId: sale.AgentPendingSalesID,
        //             pendingSalesDtlId: null,
        //             projectName: sale.ProjectName?.trim() || '',
        //             projectCode: sale.PendingSalesTranCode?.trim() || '',
        //             // agentName: sale.AgentName || sale.CreatedByName || '',
        //             agentName: sale.SellerName || sale.AgentName || sale.CreatedBy || '',
        //             divisionId: sale.DivisionID,
        //             divisionName: sale.Division,
        //             reservationDate: sale.ReservationDate,
        //             dateFiled: sale.DateFiled,
        //             approvalStatus: sale.ApprovalStatus,
        //             hasRemarks: sale.Remarks ? true : false,
        //             isEditable: isSubmitter ? role == sale.ApprovalStatus : role == (sale.ApprovalStatus + 1),
        //             isRejected: sale.IsRejected ? true : false,
        //             //source: 'othersPending'
        //         }
        //     });
        //     othersPendingSales.push(...pendingSales)
        //     combinedSales.push(...pendingSales);
        // }

        // Convert division totals map to array
        const divisionTotals = Array.from(divisionTotalsMap.values())
            .sort((a, b) => a.divisionName.localeCompare(b.divisionName));

        // Sort by dateFiled descending
        combinedSales.sort((a, b) => new Date(b.dateFiled ? b.dateFiled : b.reservationDate).getTime() - new Date(a.dateFiled ? a.dateFiled : a.reservationDate).getTime());

        // Apply pagination if needed
        let paginatedSales = combinedSales;
        let totalPages = 1;

        if (pagination?.page && pagination?.pageSize) {
            const startIndex = (pagination.page - 1) * pagination.pageSize;
            const endIndex = startIndex + pagination.pageSize;
            paginatedSales = combinedSales.slice(startIndex, endIndex);
            totalPages = Math.ceil(combinedSales.length / pagination.pageSize);
        }

        // Calculate total sales amount

        const totalSalesAmount = await getTotalPersonalSales(
            {
                agentId: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                brokerName: broker ? broker.RepresentativeName : undefined
            }, 
            { 
                month: filters?.month, 
                year: filters?.year 
            }
        );

        function getDuplicateReport(array: any[]) {
            const map = new Map();
            
            array.forEach((item, index) => {
                const key = `${item.salesId}-${item.pendingSalesId}-${item.projectCode}`;
                
                if (!map.has(key)) {
                map.set(key, []);
                }
                map.get(key).push(index);
            });
            
            const duplicates: any[] = [];
            map.forEach((indices, key) => {
                if (indices.length > 1) {
                duplicates.push({
                    key,
                    count: indices.length,
                    indices,
                    items: indices.map((i: any) => array[i])
                });
                }
            });
            
            return duplicates;
        }

        const result = {
            totalPages: totalPages,
            totalSalesAmount: totalSalesAmount.data,
            divisionTotals: divisionTotals,
            sales: paginatedSales,
            // debug: {
            //     totalResults: combinedSales.length,
            //     approved: approvedTrans,
            //     pending: selfPendingSales,
            //     others: othersPendingSales,
            //     sdApproved: sdApprovedSalesArr, 
            //     duplicates: getDuplicateReport(combinedSales)
            // }
        };

        return {
            success: true,
            data: result
        };

    } catch (error: any) {
        return {
            success: false,
            data: [],
            error: {
                code: 500,
                message: error.message
            }
        };
    }
};

const pendingSaleValidation = (
    currentStatus: SaleStatus, 
    requiredStatus: SaleStatus
): { validated: boolean; message: string } => {
    if (currentStatus === SaleStatus.REJECTED) {
        return { 
            validated: false, 
            message: 'This sale has already been rejected.' 
        };
    }
    
    if (currentStatus === SaleStatus.SALES_ADMIN_APPROVED) {
        return { 
            validated: false, 
            message: 'This sale has already been fully approved.' 
        };
    }
    
    if (currentStatus !== requiredStatus) {
        if (currentStatus > requiredStatus) {
            return { 
                validated: false, 
                message: 'This sale has already been approved at this stage.' 
            };
        }
        return { 
            validated: false, 
            message: 'This sale has not reached this approval stage yet.' 
        };
    }
    
    return { validated: true, message: '' };
};

enum Roles {
    SALES_ADMIN = 'SALES ADMIN',
}

export const editPendingSaleService = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    data: {
        pendingSalesId: number,
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
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: AddPendingSaleDetail[]
    }
) => {

    // validations

    const pendingSale = await getPendingSaleById(data.pendingSalesId)

    if(!pendingSale.success && !pendingSale.data){
        return {
            success: false,
            data: {},
            error: {
                message: 'No pending sale found.',
                code: 400
            }
        }
    }

    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }

    if(user.agentUserId && user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'Cannot submit both agent and web user.',
                code: 400
            }
        }
    }
    
    let mobileAgentData: VwAgentPicture = {} as VwAgentPicture
    let webAgentData: ITblUsersWeb = {} as ITblUsersWeb
    let role = ''

    if(user.agentUserId){
        const agentData = await findAgentDetailsByUserId(user.agentUserId)
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

        role = agentData.data.Position || ''
        mobileAgentData = agentData.data
        user.agentUserId = agentData.data.AgentID
    }

    else if(user.webUserId) {
        const webUserData = await findEmployeeUserById(user.webUserId)

        if(!webUserData.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        if(!webUserData.data.UserWebID){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        role = webUserData.data.Role
        webAgentData = webUserData.data
        user.webUserId = webUserData.data.UserWebID
    }

    else {
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }
    
    let project: VwProjectDeveloper | undefined = undefined
    
    if(data.projectID){
        let projectQuery = await getProjectById(data.projectID)
        if(!projectQuery.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No project found',
                    code: 400
                }
            }
        }

        project = projectQuery.data
        
    }

    
    let receiptMetadata: IImage | undefined = undefined;
    let receipt = data.images?.receipt;
    if(receipt){
        receiptMetadata = {
            FileName: receipt.originalname,
            ContentType: receipt.mimetype,
            FileExt: path.extname(receipt.originalname),
            FileSize: receipt.size,
            FileContent: receipt.buffer
        }
    }

    let agreementMetadata: IImage | undefined = undefined; 
    let agreement = data.images?.agreement;
    if(agreement){
        agreementMetadata = {
            FileName: agreement.originalname,
            ContentType: agreement.mimetype,
            FileExt: path.extname(agreement.originalname),
            FileSize: agreement.size,
            FileContent: agreement.buffer
        }
    }

    const effectiveDivID = data.divisionID !== undefined ? data.divisionID : pendingSale.data.DivisionID

    if(isBrokerTransactionDivision(effectiveDivID) && role !== 'SALES ADMIN'){
        return {
            success: false,
            data: {},
            error: {
                message: 'Only Sales Admin can edit Broker Transactions.',
                code: 403
            }
        }
    }

    if (data.commissionRates !== undefined) {
        const filteredCommissions = filterCommissionRatesForTransaction(data.commissionRates, effectiveDivID)

        if(!filteredCommissions.success){
            return {
                success: false,
                data: {},
                error: filteredCommissions.error
            }
        }

        data.commissionRates = filteredCommissions.data
    }

    const normalizedCommissions = await getValidatedCommissionRates(data.commissionRates)

    if(!normalizedCommissions.success){
        return {
            success: false,
            data: {},
            error: {
                message: normalizedCommissions.error?.message || 'Invalid commission rates.',
                code: normalizedCommissions.error?.code || 400
            }
        }
    }

    const validCommissions = normalizedCommissions.data

    const updatedData = {
        ...data,
        ...project && {developerID: Number(project.DeveloperID)},
        ...(data.divisionID !== undefined && {divisionID: data.divisionID}),
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        ...(data.commissionRates !== undefined && { commissionRates: validCommissions })
    }

    const updatePendingSale = await editPendingSale(
        {
            ...user.agentUserId && {agentUserId: user.agentUserId},
            ...user.webUserId && {webUserId: user.webUserId},
        },
        role,
        pendingSale.data.AgentPendingSalesID,
        updatedData
    )

    if(!updatePendingSale.success){
        return {
            success: false,
            data: {},
            error: {
                message: updatePendingSale?.error?.message,
                code: 400
            }
        }
    }

    return {
        success: true,
        data: updatePendingSale.data,
    }
}

export const editPendingSaleServiceR2 = async (
    user: {
        agentUserId?: number,
        webUserId?: number
    },
    data: {
        pendingSalesId: number,
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
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: AddPendingSaleDetail[]
    }
) => {

    // validations

    const pendingSale = await getPendingSaleById(data.pendingSalesId)

    if(!pendingSale.success && !pendingSale.data){
        return {
            success: false,
            data: {},
            error: {
                message: 'No pending sale found.',
                code: 400
            }
        }
    }

    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }

    if(user.agentUserId && user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'Cannot submit both agent and web user.',
                code: 400
            }
        }
    }
    
    let mobileAgentData: VwAgentPicture = {} as VwAgentPicture
    let webAgentData: ITblUsersWeb = {} as ITblUsersWeb
    let role = ''

    if(user.agentUserId){
        const agentData = await findAgentDetailsByUserId(user.agentUserId)
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

        role = agentData.data.Position || ''
        mobileAgentData = agentData.data
        user.agentUserId = agentData.data.AgentID
    }

    else if(user.webUserId) {
        const webUserData = await findEmployeeUserById(user.webUserId)

        if(!webUserData.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        if(!webUserData.data.UserWebID){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        role = webUserData.data.Role
        webAgentData = webUserData.data
        user.webUserId = webUserData.data.UserWebID
    }

    else {
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }
    
    let project: VwProjectDeveloper | undefined = undefined
    
    if(data.projectID){
        let projectQuery = await getProjectById(data.projectID)
        if(!projectQuery.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No project found',
                    code: 400
                }
            }
        }

        project = projectQuery.data
        
    }

    const effectiveDivID = data.divisionID !== undefined ? data.divisionID : pendingSale.data.DivisionID

    if(isBrokerTransactionDivision(effectiveDivID) && role !== 'SALES ADMIN'){
        return {
            success: false,
            data: {},
            error: {
                message: 'Only Sales Admin can edit Broker Transactions.',
                code: 403
            }
        }
    }

    if (data.commissionRates !== undefined) {
        const filteredCommissions = filterCommissionRatesForTransaction(data.commissionRates, effectiveDivID)

        if(!filteredCommissions.success){
            return {
                success: false,
                data: {},
                error: filteredCommissions.error
            }
        }

        data.commissionRates = filteredCommissions.data
    }

    const normalizedCommissions = await getValidatedCommissionRates(data.commissionRates)

    if(!normalizedCommissions.success){
        return {
            success: false,
            data: {},
            error: {
                message: normalizedCommissions.error?.message || 'Invalid commission rates.',
                code: normalizedCommissions.error?.code || 400
            }
        }
    }

    const validCommissions = normalizedCommissions.data

    const updatedData = {
        ...data,
        ...project && {developerID: Number(project.DeveloperID)},
        ...(data.divisionID !== undefined && {divisionID: data.divisionID}),
        ...(data.commissionRates !== undefined && { commissionRates: validCommissions })
    }

    const updatePendingSale = await editPendingSaleR2(
        {
            ...user.agentUserId && {agentUserId: user.agentUserId},
            ...user.webUserId && {webUserId: user.webUserId},
        },
        role,
        pendingSale.data.AgentPendingSalesID,
        updatedData
    )

    if(data.images && data.images.receipt){
        let receiptImg: IImageR2 | undefined = {
            FileName: `${pendingSale.data.PendingSalesTranCode}-receipt_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
            ContentType: data.images.receipt.mimetype,
            FileExt: path.extname(data.images.receipt.originalname),
            FileSize: data.images.receipt.size,
            FileContent: null,
            StorageKey: null
        }

        const addDBImage = await addImage(receiptImg)

        const r2Upload = await r2UploadReceipt(pendingSale.data.PendingSalesTranCode, data.images.receipt)

        const editImageResult = await editImage(addDBImage.data.ImageID, { StorageKey: r2Upload.data.storageKey} as IImage)

        const existing = pendingSale.data.Images?.filter((i) => i.ImageType == 'receipt')

        console.log('receipt existing', existing)

        if(existing){
            const deleteSalesTranImage = await deleteSaleTranImages({ imageId: existing.map((i) => Number(i.ImageID)) || undefined})
            
            console.log(deleteSalesTranImage)
        }

        const bind = await bindImagesToSales([{ id: addDBImage.data.ImageID, type: 'receipt'}], data.pendingSalesId)

        if(!bind.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Editing sale data.images failed.',
                    code: 400
                }
            }
        }
    }

    if(data.images && data.images.agreement){
        let agreementImg: IImageR2 | undefined = {
            FileName: `${pendingSale.data.PendingSalesTranCode}-agreement_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
            ContentType: data.images.agreement.mimetype,
            FileExt: path.extname(data.images.agreement.originalname),
            FileSize: data.images.agreement.size,
            FileContent: null,
            StorageKey: null
        }

        const addDBImage = await addImage(agreementImg)

        const r2Upload = await r2UploadReceipt(pendingSale.data.PendingSalesTranCode, data.images.agreement)

        const editImageResult = await editImage(addDBImage.data.ImageID, { StorageKey: r2Upload.data.storageKey} as IImage)

        const existing = pendingSale.data.Images?.filter((i) => i.ImageType == 'agreement')

        if(existing){
            const deleteSalesTranImage = await deleteSaleTranImages({ imageId: existing.map((i) => Number(i.ImageID)) || undefined})
        }

        const bind = await bindImagesToSales([{ id: addDBImage.data.ImageID, type: 'agreement'}], data.pendingSalesId)

        if(!bind.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Editing sale data.images failed.',
                    code: 400
                }
            }
        }
    }

    if(!updatePendingSale.success){
        return {
            success: false,
            data: {},
            error: {
                message: updatePendingSale?.error?.message,
                code: 400
            }
        }
    }

    return {
        success: true,
        data: updatePendingSale.data,
    }
}

export const editPendingSalesDetailsService = async (
    agentUserId: number,
    pendingSalesId: number,
    commissionRates?: AddPendingSaleDetail[]
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

    const valid = pendingSaleValidation(
        pendingSale.data.ApprovalStatus,
        SaleStatus.NEWLY_SUBMITTED
    )

    if(valid.validated == false){
        return {
            success: false,
            data: {},
            error: {
                message: valid.message,
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

    let validCommissions: AddPendingSaleDetail[] | undefined = undefined

    if(commissionRates !== undefined){
        const effectiveDivID = pendingSale.data.DivisionID

        if(isBrokerTransactionDivision(effectiveDivID)){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Only Sales Admin can edit Broker Transactions.',
                    code: 403
                }
            }
        }

        const filteredCommissions = filterCommissionRatesForTransaction(commissionRates, effectiveDivID)

        if(!filteredCommissions.success){
            return {
                success: false,
                data: {},
                error: filteredCommissions.error
            }
        }

        commissionRates = filteredCommissions.data

        const normalizedCommissions = await getValidatedCommissionRates(commissionRates)

        if(!normalizedCommissions.success){
            return {
                success: false,
                data: {},
                error: {
                    message: normalizedCommissions.error?.message || 'Invalid commission rates.',
                    code: normalizedCommissions.error?.code || 400
                }
            }
        }

        validCommissions = normalizedCommissions.data
    }

    const result = await editPendingSalesDetails(agentData.data.AgentID, pendingSalesId, validCommissions);

    if(!result.success){
        logger('editPendingSalesDetailsService', {commissionRates: commissionRates})
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

export const editSalesTranService = async (
    userId: number,
    data: {
        salesTranId: number,
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
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: AddPendingSaleDetail[]
    }
) => {

    // validations

    const pendingSale = await getSalesTransDetails(data.salesTranId)

    if(!pendingSale.success && !pendingSale.data){
        return {
            success: false,
            data: {},
            error: {
                message: 'No pending sale found.',
                code: 400
            }
        }
    }

    const sale = pendingSale.data[0]
    
    let project: VwProjectDeveloper | undefined = undefined
    
    if(data.projectID){
        let projectQuery = await getProjectById(data.projectID)
        if(!projectQuery.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No project found',
                    code: 400
                }
            }
        }

        project = projectQuery.data
        
    }

    
    let receiptMetadata: IImage | undefined = undefined;
    let receipt = data.images?.receipt;
    if(receipt){
        receiptMetadata = {
            FileName: receipt.originalname,
            ContentType: receipt.mimetype,
            FileExt: path.extname(receipt.originalname),
            FileSize: receipt.size,
            FileContent: receipt.buffer
        }
    }

    let agreementMetadata: IImage | undefined = undefined; 
    let agreement = data.images?.agreement;
    if(agreement){
        agreementMetadata = {
            FileName: agreement.originalname,
            ContentType: agreement.mimetype,
            FileExt: path.extname(agreement.originalname),
            FileSize: agreement.size,
            FileContent: agreement.buffer
        }
    }

    if(data.commissionRates !== undefined){
        const effectiveDivID = data.divisionID !== undefined ? data.divisionID : sale.DivisionID
        const filteredCommissions = filterCommissionRatesForTransaction(data.commissionRates, effectiveDivID)

        if(!filteredCommissions.success){
            return {
                success: false,
                data: {},
                error: filteredCommissions.error
            }
        }

        data.commissionRates = filteredCommissions.data
    }

    const normalizedCommissions = await getValidatedCommissionRates(data.commissionRates)

    if(!normalizedCommissions.success){
        return {
            success: false,
            data: {},
            error: {
                message: normalizedCommissions.error?.message || 'Invalid commission rates.',
                code: normalizedCommissions.error?.code || 400
            }
        }
    }

    const updatedData = {
        ...data,
        ...project && {developerID: Number(project.DeveloperID)},
        ...(data.divisionID !== undefined && {divisionID: data.divisionID}),
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        ...(data.commissionRates !== undefined && { commissionRates: normalizedCommissions.data })
    }

    const updateSalesTran = await editSalesTransaction(
        userId,
        data.salesTranId,
        updatedData
    )

    if(!updateSalesTran.success){
        return {
            success: false,
            data: {},
            error: {
                message: updateSalesTran?.error?.message,
                code: 400
            }
        }
    }

    return {
        success: true,
        data: updateSalesTran.data,
    }
}

export const approveSalesDirectorService = async (agentUserId: number, pendingSalesId: number): QueryResult<IAgentPendingSale> => {
    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    const agentData = await findAgentDetailsByUserId(agentUserId);

    if(!agentData.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(pendingSale.data.DivisionID != agentData.data.DivisionID){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'This sale does not belong to your division.',
                code: 403
            }
        }
    }

    const valid = pendingSaleValidation(
        pendingSale.data.ApprovalStatus,
        SaleStatus.UNIT_MANAGER_APPROVED
    )

    if(!valid.validated){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: valid.message,
                code: 400
            }
        }
    }

    const result = await approveNextStage({
        agentId: agentData.data.AgentID,
        pendingSalesId: pendingSalesId,
        nextApprovalStatus: SaleStatus.SALES_DIRECTOR_APPROVED,
        nextSalesStatus: SalesStatusText.PENDING_BH
    })

    if(!result.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
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

export const approveBranchHeadService = async (webUserId: number, pendingSalesId: number): QueryResult<IAgentPendingSale> => {

    const userWeb = await findEmployeeUserById(webUserId);

    if(!userWeb.success){
        return {
            success: false,
            data: {} as IAgentPendingSale, 
            error: {
                message: 'No user found',
                code: 404
            }
        }   
    }

    if(userWeb.data.Role != 'BRANCH SALES STAFF'){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'Not enough permission.',
                code: 403
            }
        }
    }

    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    if(pendingSale.data.SalesBranchID != userWeb.data.BranchID){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'This sale does not belong to your branch.',
                code: 403
            }
        }
    }

    const checkValid = pendingSaleValidation(
        pendingSale.data.ApprovalStatus,
        SaleStatus.SALES_DIRECTOR_APPROVED
    )

    if(checkValid.validated == false){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: checkValid.message,
                code: 400
            }
        }
    }

    const result = await approveNextStage({
        userId: webUserId,
        pendingSalesId: pendingSalesId,
        nextApprovalStatus: SaleStatus.BRANCH_HEAD_APPROVED,
        nextSalesStatus: SalesStatusText.PENDING_SA
    })

    if(!result.success){
        return {
            success: false,
            data: {} as IAgentPendingSale,
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

export const approveSalesAdminService = async (webUserId: number, pendingSalesId: number): QueryResult<any> => {
    
    // validations
    const userWeb = await findEmployeeUserById(webUserId);

    if(!userWeb.success){
        return {
            success: false,
            data: {} as IAgentPendingSale, 
            error: {
                message: 'No user found',
                code: 404
            }
        }   
    }

    if(userWeb.data.Role != 'SALES ADMIN'){
        return {
            success: false,
            data: {} as IAgentPendingSale,
            error: {
                message: 'Not enough permission.',
                code: 403
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

    const valid = pendingSaleValidation(
        pendingSale.data.ApprovalStatus,
        SaleStatus.BRANCH_HEAD_APPROVED
    )

    if(!valid.validated){
        return {
            success: false,
            data: {},
            error: {
                message: valid.message,
                code: 400
            }
        }
    }

    const result = await approvePendingSaleTransaction(userWeb.data.UserWebID, pendingSalesId);

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

export const rejectPendingSaleService = async ( user: { agentUserId?: number, webUserId?: number }, pendingSalesId: number, remarks?: string ): QueryResult<any> => {

    if(!user.agentUserId && !user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
                code: 400
            }
        }
    }

    if(user.agentUserId && user.webUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'Cannot submit both agent and web user.',
                code: 400
            }
        }
    }

    let mobileUserData: VwAgents = {} as VwAgents
    let webUserData: ITblUsersWeb = {} as ITblUsersWeb

    if(user.agentUserId){
            
        const agentData = await findAgentDetailsByUserId(user.agentUserId)

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

        mobileUserData = agentData.data
    }

    else if(user.webUserId){
        const data = await findEmployeeUserById(user.webUserId)

        if(!data.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        webUserData = data.data
    }
    else {
        return {
            success: false,
            data: {},
            error: {
                message: 'No user submitted.',
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

    if(pendingSale.data.IsRejected == 1){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been rejected.',
                code: 400
            }
        }
    }

    if(user.agentUserId){
        if(mobileUserData.Position == 'UNIT MANAGER' && pendingSale.data.ApprovalStatus == 2){
            return {
                success: false,
                data: {},
                error: {
                    message: 'This sale can only be rejected by the Sales Director.',
                    code: 400
                }
            }
        }
    }
    
    if(user.webUserId){
        if(webUserData.Role == 'BRANCH SALES STAFF' && pendingSale.data.ApprovalStatus == 4){
            return {
                success: false,
                data: {},
                error: {
                    message: 'This sale can only be rejected by the Sales Admin.',
                    code: 400
                }
            }
        }
    }

    // set approval status and sales status

    let approvalStatus: number | undefined = undefined
    let salesStatus: string | undefined = undefined

    // check for agent first

    let createdUserId: VwAgentPicture | (ITblUsersWeb & { Position?: string }) = {} as VwAgentPicture | (ITblUsersWeb & { Position?: string })

    if(pendingSale.data.CreatedByWeb){
        const createdByWeb = await findEmployeeUserById(pendingSale.data.CreatedByWeb)
    
        const createdByWebObj = {
            ...createdByWeb.data && { ...createdByWeb.data, Position: createdByWeb.data.Role }
        }

        createdUserId = createdByWebObj
    }

    else if (pendingSale.data.CreatedBy){
        const createdBy = await findAgentDetailsByAgentId(pendingSale.data.CreatedBy)
        
        createdUserId = createdBy.data
    }
    
    // const createdUserId = createdByWebObj.Position ? createdByWebObj : createdBy.data

    // if(!createdBy.success && !createdByWeb.success){
    //     approvalStatus = SaleStatus.NEWLY_SUBMITTED,
    //     salesStatus = SalesStatusText.PENDING_UM
    // }

    if(createdUserId.Position == 'SALES PERSON'){
        approvalStatus = SaleStatus.NEWLY_SUBMITTED,
        salesStatus = SalesStatusText.PENDING_UM
    }

    if(createdUserId.Position == 'UNIT MANAGER'){
        approvalStatus = SaleStatus.UNIT_MANAGER_APPROVED,
        salesStatus = SalesStatusText.PENDING_SD
    }

    if(createdUserId.Position == 'SALES DIRECTOR'){
        approvalStatus = SaleStatus.SALES_DIRECTOR_APPROVED,
        salesStatus = SalesStatusText.PENDING_BH
    }

    if(createdUserId.Position == 'BRANCH HEAD' || createdUserId.Position == 'BRANCH SALES STAFF'){
        approvalStatus = SaleStatus.BRANCH_HEAD_APPROVED,
        salesStatus = SalesStatusText.PENDING_SA
    }

    if(createdUserId.Position == 'SALES ADMIN'){
        approvalStatus = SaleStatus.SALES_ADMIN_APPROVED,
        salesStatus = SalesStatusText.APPROVED
    }

    // get agent ids
    let agentId = undefined
    let employeeId = undefined

    console.log(user)
    if(user.agentUserId){
        const result = await findAgentDetailsByUserId(user.agentUserId)

        if(!result.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        agentId = result.data.AgentID
    }

    if(user.webUserId){
        const result = await findEmployeeUserById(user.webUserId)

        if(!result.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'No user found',
                    code: 400
                }
            }
        }

        employeeId = result.data.UserWebID
    }

    if(!agentId && !employeeId){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    const result = await rejectPendingSale(
        {
            agentId: agentId ? agentId : undefined,
            brokerId: employeeId ? employeeId : undefined
        }, 
        pendingSalesId, 
        (approvalStatus || 1), 
        (salesStatus || SalesStatusText.PENDING_UM), 
        remarks
    );

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

export const archivePendingSaleService = async (webUserId: number, pendingSalesId: number) => {
    const data = await findEmployeeUserById(webUserId)

    if(!data.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    const result = await editPendingSale({ webUserId: data.data.UserWebID}, 'SALES ADMIN', pendingSalesId, { approvalStatus: -1, salesStatus: SalesStatusText.ARCHIVED })

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Archiving sales failed.',
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

export const getWebPendingSalesService = async (
    userId: number, 
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

    const userData = await findEmployeeUserById(userId);

    if(!userData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    const role = userData.data.Role.toLowerCase().trim();

    if(role != 'branch sales staff' && role != 'sales admin'){
        return {
            success: false,
            data: {},
            error: {
                message: 'Not enough permission.',
                code: 403
            }
        }
    }

    const [result, ownedSales] = await Promise.all (
        [
            getPendingSalesV2(
                undefined, 
                { 
                    ...filters,
                    approvalStatus: role == 'branch sales staff' ? [3] : undefined,
                    salesBranch: role == 'branch sales staff' ? userData.data.BranchID : undefined,
                    isUnique: true
                }, 
                pagination
            ),
            getPendingSalesV2(
                undefined, 
                { 
                    ...filters,
                    // approvalStatus: role == 'branch sales staff' ? [3] : [4],
                    // salesBranch: role == 'branch sales staff' ? userData.data.BranchID : undefined,
                    createdByWeb: userId,
                    isUnique: true
                }, 
                pagination
            ),
        ]
    )

    console.log(ownedSales.data)

    const resultArray: any[] = []

    if(!result.success){
        logger(result.error?.message || '', {data: filters})
        return {
            success: false,
            data: [],
            error: {
                message: 'Getting pending sales failed.' + result.error?.message,
                code: 400
            }
        }
    }

    if(!ownedSales.success){
        logger(ownedSales.error?.message || '', {data: filters})
        return {
            success: false,
            data: [],
            error: {
                message: 'Getting pending sales failed.'    + ownedSales.error?.message,
                code: 400
            }
        }
    }



    const obj = result.data.results.map((item: AgentPendingSale) => {
        resultArray.push({
            AgentPendingSalesID: item.AgentPendingSalesID,
            PendingSalesTransCode: item.PendingSalesTranCode,
            SellerName: item.SellerName || 'N/A',
            FinancingScheme: item.FinancingScheme,
            ReservationDate: item.ReservationDate,
            ApprovalStatus: item.ApprovalStatus,
            CreatedBy: item.CreatedBy
        })
    })

    const ownedObj = ownedSales.data.results.map((item: AgentPendingSale) => {
        resultArray.push({
             AgentPendingSalesID: item.AgentPendingSalesID,
            PendingSalesTransCode: item.PendingSalesTranCode,
            SellerName: item.SellerName || 'N/A',
            FinancingScheme: item.FinancingScheme,
            ReservationDate: item.ReservationDate,
            ApprovalStatus: item.ApprovalStatus,
            CreatedBy: item.CreatedBy
        })
    })

    return {
        success: true,
        data: resultArray
    }
}

export const getWebPendingSalesDetailService = async (userId: number, pendingSalesId: number): QueryResult<any> => {

    const user = await findEmployeeUserById(userId);

    if(!user.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

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

    if(user.data.Role == 'BRANCH SALES STAFF'){
        if(result.data.SalesBranchID != user.data.BranchID){
            return {
                success: false,
                data: {},
                error: {
                    message: 'This sale does not belong to your branch.',
                    code: 403
                }
            }
        }
    }

    let resultCopy = { ...result.data }
    if (result.data.Images && result.data.Images.length > 0) {
        const imageCopies = result.data.Images
        const images: (ITypedImageBase64 & { URL: string })[] = await Promise.all(
            imageCopies.map(async (img: ITypedImageBase64) => {
                const url = img.StorageKey ? (await getPresignedUrl(img.StorageKey)).data : await Promise.resolve('')
                return {
                    ...img,
                    URL: url
                }
            })
        )
        resultCopy = { ...result.data, Images: images }
    }
    const detailsArray = await mapPendingCommissionDetails(result.data.Details, result.data.DivisionID)

    

    let lastUpdatedByName = ''
    if(result.data.LastUpdateby){
        const lastUpdatedByAgent = await findAgentDetailsByAgentId(result.data.LastUpdateby)
        if(lastUpdatedByAgent.success && lastUpdatedByAgent.data.AgentID){
            console.log('lastUpdatedByAgent', lastUpdatedByAgent.data)
            lastUpdatedByName = lastUpdatedByAgent.data.AgentName ? lastUpdatedByAgent.data.AgentName : ''
        }
    }
    else if (result.data.LastUpdateByWeb){
        const lastUpdatedByEmployee = await findEmployeeUserById(result.data.LastUpdateByWeb)
        if(lastUpdatedByEmployee.success && lastUpdatedByEmployee.data.UserWebID){
            lastUpdatedByName = lastUpdatedByEmployee.data.EmpName ? lastUpdatedByEmployee.data.EmpName : ''
        }
    }

    const obj = {
        ...resultCopy,
        Details: detailsArray,
        LastUpdateby: lastUpdatedByName,
        LastUpdateId: result.data.LastUpdateby
    }


    return {
        success: true,
        data: obj
    }
}

export const archiveSalesTransactionService = async (userId: number, salesTranId: number): QueryResult<any> => {
    const userData = await findEmployeeUserById(userId);

    if(!userData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    const result = await archiveSale(userId, salesTranId)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Error archiving sale',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const archivePendingSalesTransactionService = async (userId: number, pendingSalesTranId: number): QueryResult<any> => {
    const userData = await findEmployeeUserById(userId);

    if(!userData.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    const result = await archivePendingSale(userId, pendingSalesTranId)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Error archiving sale',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editPendingSaleImagesService = async (
    pendingSalesId: number, 
    images: {
        receipt?: Express.Multer.File,
        agreement?: Express.Multer.File
    },
    agentUserId: number,
): QueryResult<any> => {
    
    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success && !pendingSale.data){
        return {
            success: false,
            data: {},
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    const agentUser = await findAgentDetailsByUserId(agentUserId)

    if(!agentUser.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    if(pendingSale.data.CreatedBy != agentUser.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale does not belong to you.',
                code: 403
            }
        }
    }

    if(pendingSale.data.ApprovalStatus > 1){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been approved.',
                code: 403
            }
        }
    }

    let receiptImg: IImage | undefined = images.receipt ?{
        FileName: images.receipt.originalname,
        ContentType: images.receipt.mimetype,
        FileExt: path.extname(images.receipt.originalname),
        FileSize: images.receipt.size,
        FileContent: images.receipt.buffer
    } : undefined

    let agreementImg: IImage | undefined = images.agreement ?{
        FileName: images.agreement.originalname,
        ContentType: images.agreement.mimetype,
        FileExt: path.extname(images.agreement.originalname),
        FileSize: images.agreement.size,
        FileContent: images.agreement.buffer
    } : undefined

    const result = await editSaleImages(pendingSalesId, undefined, receiptImg, agreementImg, pendingSale.data.PendingSalesTranCode) 

    if(!result.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'Editing sale images failed.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editPendingSaleImagesServiceR2 = async (
    pendingSalesId: number, 
    images: {
        receipt?: Express.Multer.File,
        agreement?: Express.Multer.File
    },
    agentUserId: number,
): QueryResult<any> => {
    
    const pendingSale = await getPendingSaleById(pendingSalesId)

    if(!pendingSale.success && !pendingSale.data){
        return {
            success: false,
            data: {},
            error: {
                message: 'No sales found',
                code: 400
            }
        }
    }

    const agentUser = await findAgentDetailsByUserId(agentUserId)

    if(!agentUser.success){
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    if(pendingSale.data.CreatedBy != agentUser.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale does not belong to you.',
                code: 403
            }
        }
    }

    if(pendingSale.data.ApprovalStatus > 1){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale has already been approved.',
                code: 403
            }
        }
    }

    const pendingSaleTranImage = await getSaleTranImages({ pendingSalesId: pendingSalesId })

    if(images.receipt){
        let receiptImg: IImageR2 | undefined = {
            FileName: `${pendingSale.data.PendingSalesTranCode}-receipt_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
            ContentType: images.receipt.mimetype,
            FileExt: path.extname(images.receipt.originalname),
            FileSize: images.receipt.size,
            FileContent: null,
            StorageKey: null
        }

        const addDBImage = await addImage(receiptImg)

        const r2Upload = await r2UploadReceipt(pendingSale.data.PendingSalesTranCode, images.receipt)

        const editImageResult = await editImage(addDBImage.data.ImageID, { StorageKey: r2Upload.data.storageKey} as IImage)

        const existing = pendingSale.data.Images?.filter((i) => i.ImageType == 'receipt')

        if(existing){
            const deleteSalesTranImage = await deleteSaleTranImages({ imageId: existing.map((i) => Number(i.ImageID)) || undefined})
        }

        const bind = await bindImagesToSales([{ id: addDBImage.data.ImageID, type: 'receipt'}], pendingSalesId)

        if(!bind.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Editing sale images failed.',
                    code: 400
                }
            }
        }
    }

    if(images.agreement){
        let agreementImg: IImageR2 | undefined = {
            FileName: `${pendingSale.data.PendingSalesTranCode}-receipt_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase(),
            ContentType: images.agreement.mimetype,
            FileExt: path.extname(images.agreement.originalname),
            FileSize: images.agreement.size,
            FileContent: null,
            StorageKey: null
        }

        const addDBImage = await addImage(agreementImg)

        const r2Upload = await r2UploadReceipt(pendingSale.data.PendingSalesTranCode, images.agreement)

        const editImageResult = await editImage(addDBImage.data.ImageID, { StorageKey: r2Upload.data.storageKey} as IImage)

        const existing = pendingSale.data.Images?.filter((i) => i.ImageType == 'agreement')

        if(existing){
            const deleteSalesTranImage = await deleteSaleTranImages({ imageId: existing.map((i) => Number(i.ImageID)) || undefined})
        }

        const bind = await bindImagesToSales([{ id: addDBImage.data.ImageID, type: 'agreement'}], pendingSalesId)

        if(!bind.success){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Editing sale images failed.',
                    code: 400
                }
            }
        }
    }

    return {
        success: true,
        data: {}
    }
}

// export const getDivisionSalesYearlyTotalsFnService = async (userId: number, filters?: {startYear?: number, endYear?: number, months?: number[]}): QueryResult<DivisionYearlySalesGrouped[]> => {
//     const result = await getDivisionSalesTotalsYearlyFn(
//         [
//             {field: 'Year', direction: 'desc'},
//             {field: 'Division', direction: 'asc'}
//         ],
//         undefined,
//         {
//             startYear: filters?.startYear,
//             endYear: filters?.endYear,
//             months: filters?.months
//         }
//     )

//     // Group by Division
//     const groupedData = result.data.reduce((acc, item) => {
//         const existingDivision = acc.find(d => d.Division === item.Division);
        
//         if (existingDivision) {
//             existingDivision.YearData.push({
//                 Year: item.Year, 
//                 Month: filters?.month ? filters.month : null,
//                 CurrentMonth: item.CurrentMonth,
//                 LastMonth: item.LastMonth,
//                 CurrentMonthLastYear: item.CurrentMonthLastYear,
//                 CurrentQuarter: item.CurrentQuarter,
//                 LastQuarter: item.LastQuarter,
//                 LastYear: item.LastYear,
//                 CurrentYear: item.CurrentYear
//             });
//         } else {
//             acc.push({
//                 Division: item.Division,
//                 YearData: [{
//                     Year: item.Year,
//                     Month: filters?.month ? filters.month : null,
//                     CurrentMonth: item.CurrentMonth,
//                     LastMonth: item.LastMonth,
//                     CurrentMonthLastYear: item.CurrentMonthLastYear,
//                     CurrentQuarter: item.CurrentQuarter,
//                     LastQuarter: item.LastQuarter,
//                     LastYear: item.LastYear,
//                     CurrentYear: item.CurrentYear
//                 }]
//             });
//         }
        
//         return acc;
//     }, [] as Array<{Division: string, YearData: Array<Omit<FnDivisionSalesYearly, 'Division'>>}>);
    

//     if(!result.success){
//         return {
//             success: false,
//             data: [],
//             error: {
//                 message: 'Failed to get division yearly sales totals.',
//                 code: 400
//             }
//         }
//     }

//     return {
//         success: true,
//         data: groupedData
//     }
// }

// export const getDivisionSalesYearlyTotalsFnService = async (
//     userId: number, 
//     filters?: {startYear?: number, endYear?: number, months?: number[]}
// ): QueryResult<DivisionYearlySalesGrouped[]> => {
//     const result = await getDivisionSalesTotalsYearlyFn(
//         [
//             {field: 'Year', direction: 'desc'},
//             {field: 'Division', direction: 'asc'}
//         ],
//         undefined,
//         {
//             startYear: filters?.startYear,
//             endYear: filters?.endYear,
//             months: filters?.months
//         }
//     )
    
//     if(!result.success){
//         return {
//             success: false,
//             data: [],
//             error: {
//                 message: 'Failed to get division yearly sales totals.',
//                 code: 400
//             }
//         }
//     }
    
//     // Group by Division
//     const groupedData = result.data.reduce((acc, item) => {
//         const existingDivision = acc.find(d => d.Division === item.Division);
        
//         if (existingDivision) {
//             existingDivision.YearData.push({
//                 Year: item.Year, 
//                 Month: item.Month, // This is already null or a month number from the query
//                 CurrentMonth: item.CurrentMonth,
//                 LastMonth: item.LastMonth,
//                 CurrentMonthLastYear: item.CurrentMonthLastYear,
//                 CurrentQuarter: item.CurrentQuarter,
//                 LastQuarter: item.LastQuarter,
//                 LastYear: item.LastYear,
//                 CurrentYear: item.CurrentYear
//             });
//         } else {
//             acc.push({
//                 Division: item.Division,
//                 YearData: [{
//                     Year: item.Year,
//                     Month: item.Month, // This is already null or a month number from the query
//                     CurrentMonth: item.CurrentMonth,
//                     LastMonth: item.LastMonth,
//                     CurrentMonthLastYear: item.CurrentMonthLastYear,
//                     CurrentQuarter: item.CurrentQuarter,
//                     LastQuarter: item.LastQuarter,
//                     LastYear: item.LastYear,
//                     CurrentYear: item.CurrentYear
//                 }]
//             });
//         }
        
//         return acc;
//     }, [] as Array<{Division: string, YearData: Array<Omit<FnDivisionSalesYearly, 'Division'>>}>);
    
//     return {
//         success: true,
//         data: groupedData
//     }
// }

export const getDivisionSalesYearlyTotalsFnService = async (
    userId: number, 
    filters?: {startYear?: number, endYear?: number, months?: number[]}
): QueryResult<any> => {
    const result = await getDivisionSalesTotalsYearlyFn(
        [
            {field: 'Year', direction: 'desc'},
            {field: 'Division', direction: 'asc'}
        ],
        undefined,
        {
            startYear: filters?.startYear,
            endYear: filters?.endYear,
            months: filters?.months
        }
    )
    
    if(!result.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'Failed to get division yearly sales totals.',
                code: 400
            }
        }
    }
    
    // Group by Division, then by Year
    const groupedData = result.data.reduce((acc, item) => {
        const existingDivision = acc.find(d => d.Division === item.Division);
        
        const dataItem = {
            Month: item.Month,
            CurrentMonth: item.CurrentMonth,
            LastMonth: item.LastMonth,
            CurrentMonthLastYear: item.CurrentMonthLastYear,
            CurrentQuarter: item.CurrentQuarter,
            LastQuarter: item.LastQuarter,
            LastYear: item.LastYear,
            CurrentYear: item.CurrentYear
        };
        
        if (existingDivision) {
            // Check if year already exists
            const existingYear = existingDivision.YearData.find(y => y.Year === item.Year);
            
            if (existingYear) {
                // Add month data to existing year
                existingYear.Months.push(dataItem);
            } else {
                // Create new year entry
                existingDivision.YearData.push({
                    Year: item.Year,
                    Months: [dataItem]
                });
            }
        } else {
            // Create new division entry
            acc.push({
                Division: item.Division,
                YearData: [{
                    Year: item.Year,
                    Months: [dataItem]
                }]
            });
        }
        
        return acc;
    }, [] as Array<{
        Division: string, 
        YearData: Array<{
            Year: number,
            Months: Array<{
                Month: number | null,
                CurrentMonth: number,
                LastMonth: number,
                CurrentMonthLastYear: number,
                CurrentQuarter: number,
                LastQuarter: number,
                LastYear: number,
                CurrentYear: number
            }>
        }>
    }>);

    let totals: any = {};

    // Calculate yearly totals across all divisions
    if(filters && filters.months && filters.months?.length > 0){
        const monthlyTotals = result.data.reduce((acc, item) => {
            const existingMonth = acc.find(m => m.month === item.Month && m.year === item.Year);
                
            if (existingMonth) {
                existingMonth.monthTotal += item.CurrentMonth;
            } else {
                acc.push({
                    year: item.Year,
                    month: item.Month || 0,
                    monthTotal: item.CurrentMonth
                });
            }
            
            return acc;
        }, [] as Array<{year: number, month: number, monthTotal: number}>);
            
        // Sort by year descending, then month ascending
        monthlyTotals.sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year; // Year descending
            }
            return a.month - b.month; // Month ascending
        });
        totals = monthlyTotals;
    }
    else {
        const yearlyTotals = result.data.reduce((acc, item) => {
            const existingYear = acc.find(y => y.year === item.Year);
            
            if (existingYear) {
                existingYear.yearTotal += item.CurrentMonth;
            } else {
                acc.push({
                    year: item.Year,
                    yearTotal: item.CurrentMonth
                });
            }
            
            return acc;
        }, [] as Array<{year: number, yearTotal: number}>);
        
        // Sort by year descending
        yearlyTotals.sort((a, b) => b.year - a.year);

        totals = yearlyTotals
    }
    
    return {
        success: true,
        data: {
            divisions: groupedData,
            totals: totals
        }
    }
}

export const getSalesByDeveloperTotalsFnService = async (userId: number, filters?: {month?: number, year?: number}): QueryResult<any> => {
    const [salesResult, devsResult] = await Promise.all([
        getSalesByDeveloperTotals(
            [
                {field: 'NetTotalTCP', direction: 'desc'},
                {field: 'DeveloperName', direction: 'asc'}
            ],
            undefined,
            undefined,
            {
                month: filters?.month,
                year: filters?.year
            }
        ),
        getDevelopers()
    ]);

    if(!salesResult.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'Failed to get sales by developer totals.',
                code: 400
            }
        }
    }

    if(!devsResult.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'Failed to get developers.',
                code: 400
            }
        }
    }

    // Create a map of sales by developer name for quick lookup
    const salesMap = new Map(
        salesResult.data.map(sale => [sale.DeveloperName, sale.NetTotalTCP])
    );

    // Combine developers with their sales data
    const combinedData = devsResult.data.data.map(dev => ({
        DeveloperName: dev.DeveloperName,
        NetTotalTCP: salesMap.get(dev.DeveloperName) ?? 0
    }));

    // Sort by NetTotalTCP descending, then by DeveloperName ascending
    combinedData.sort((a, b) => {
        if (b.NetTotalTCP !== a.NetTotalTCP) {
            return b.NetTotalTCP - a.NetTotalTCP;
        }
        return a.DeveloperName.localeCompare(b.DeveloperName);
    });

    return {
        success: true,
        data: combinedData
    }
}

// Sales Targets

export const getSalesTargetsService = async (filters?: {year?: number, divisionIds?: number[], divisionNames?: string[], entity?: string, id?: number}): QueryResult<ITblSalesTarget[]> => {
    const result = await getSalesTargets(filters);

    if(!result.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'Failed to get sales targets.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }

}

export const addSalesTargetService = async (userId: number, salesTarget: ITblSalesTarget): QueryResult<ITblSalesTarget> => {
    // check for existing
    const duplicate = await getSalesTargets({ year: salesTarget.TargetYear, divisionIds: [salesTarget.TargetNameID] });

    if(duplicate.success &&duplicate.data.length > 0){
        return {
            success: false,
            data: {} as ITblSalesTarget,
            error: {
                message: 'Sales target for this year and division already exists.',
                code: 400
            }
        }
    }

    // check division

    const division = await getDivisions({ divisionIds: [salesTarget.TargetNameID] });

    if(!division.success || division.data.length === 0){
        return {
            success: false,
            data: {} as ITblSalesTarget,
            error: {
                message: 'Division not found.',
                code: 400
            }
        }
    }

    salesTarget.TargetName = division.data[0].Division

    const result = await addSalesTarget(userId, salesTarget);

    if(!result.success){
        return {
            success: false,
            data: {} as ITblSalesTarget,
            error: {
                message: 'Failed to add sales target.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}


export const editSalesTargetService = async (userId: number, salesTargetId: number, salesTarget: Partial<ITblSalesTarget>): QueryResult<ITblSalesTarget> => {

    const salesTargetData = await getSalesTargets({ id: salesTargetId });

    if(!salesTargetData.success || salesTargetData.data.length === 0){
        return {
            success: false,
            data: {} as ITblSalesTarget,
            error: {
                message: 'Sales target not found.',
                code: 400
            }
        }
    }

    // check for existing
    if(salesTarget.TargetNameID){

        // check division

        const division = await getDivisions({ divisionIds: [salesTarget.TargetNameID] });

        if(!division.success || division.data.length === 0){
            return {
                success: false,
                data: {} as ITblSalesTarget,
                error: {
                    message: 'Division not found.',
                    code: 400
                }
            }
        }

        salesTarget.TargetName = division.data[0].Division

        const duplicate = await getSalesTargets({ year: salesTargetData.data[0].TargetYear, divisionIds: [salesTarget.TargetNameID] });
    
        if(duplicate.success && duplicate.data.length > 0){
            return {
                success: false,
                data: {} as ITblSalesTarget,
                error: {
                    message: 'Sales target for this year and division already exists.',
                    code: 400
                }
            }
        }
    }

    if(salesTarget.TargetYear){
        const duplicate = await getSalesTargets({ year: salesTarget.TargetYear, divisionIds: [salesTargetData.data[0].TargetNameID] });
    
        if(duplicate.success && duplicate.data.length > 0){
            return {
                success: false,
                data: {} as ITblSalesTarget,
                error: {
                    message: 'Sales target for this year and division already exists.',
                    code: 400
                }
            }
        }
    }

    

    const result = await editSalesTarget(userId, salesTargetId, salesTarget);

    if(!result.success){
        return {
            success: false,
            data: {} as ITblSalesTarget,
            error: {
                message: 'Failed to add sales target.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const deleteSalesTargetService = async (userId: number, salesTargetId: number): QueryResult<ITblSalesTarget> => {
    const result = await deleteSalesTarget(userId, salesTargetId);

    if(!result.success){
        return {
            success: false,
            data: {} as ITblSalesTarget,
            error: {
                message: 'Failed to delete sales target.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const getWebPersonalSalesService = async (
    userId: number, 
    filters?: { 
        month?: number, 
        year?: number, 
        agentId?: number, 
        brokerId?: number,
        search?: string
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
) => {

    console.log('getWebPersonalSalesService filters', filters)

    let brokerName = ''
    if(filters && filters.brokerId){
        const brokerData = await getBrokers({ brokerId: filters.brokerId })

        if(brokerData.success && brokerData.data.length > 0){
            brokerName = brokerData.data[0].RepresentativeName || ''
        }
    }

    const result = await getPersonalSales( 
        { 
            agentId: filters && filters.agentId ? filters?.agentId : undefined, 
            brokerName: filters && filters?.brokerId ? brokerName : undefined
        }, 
        filters,
        pagination
    );

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

    return {
        success: true,
        data: result.data
    }
}

// Sales Distribution List

export const getSalesDistributionListService = async(showInactive: boolean = false): QueryResult<Selectable<TblDistribution>[]> => {
    const result = showInactive
        ? await getDistributionList(true)
        : await getActiveDistributionTemplateService()

    if(!result.success){
        return {
            success: false,
            data: [] as Selectable<TblDistribution>[],
            error: {
                code: 500,
                message: 'Failed to get distribution list.'
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const addSalesDistributionListService = async(userId: number, distribution: Insertable<TblDistribution>): QueryResult<Selectable<TblDistribution>> => {
    const obj: Insertable<TblDistribution> = {
        ...distribution,
        UpdateBy: userId,
        IsActive: 1
    } 
    const result = await addDistributionList(obj);

    console.log(result)

    if(!result.success){
        return {
            success: false,
            data: {} as Selectable<TblDistribution>,
            error: {
                code: 500,
                message: 'Failed to add distribution list.'
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editSalesDistributionListService = async(userId: number, distributionId: number, distribution: Updateable<TblDistribution>): QueryResult<Selectable<TblDistribution>> => {
    const obj: Updateable<TblDistribution> = {
        ...distribution,
        UpdateBy: userId,
        LastUpdate: new Date()
    }
    const result = await editDistributionList(distributionId, obj);

    if(!result.success){
        return {
            success: false,
            data: {} as Selectable<TblDistribution>,
            error: {
                code: 500,
                message: 'Failed to edit distribution list.'
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const deleteSalesDistributionListService = async(userId: number, distributionId: number): QueryResult<Selectable<TblDistribution>> => {
    const result = await deleteDistributionList(userId, distributionId);

    if(!result.success){
        return {
            success: false,
            data: {} as Selectable<TblDistribution>,
            error: {
                code: 500,
                message: 'Failed to delete distribution list.'
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}
