import { VwAgents, VwSalesTrans, VwSalesTransactions } from "../db/db-types";
import { addPendingSale, approveNextStage, approvePendingSaleTransaction, editPendingSale, editPendingSalesDetails, editSaleImages, editSalesTransaction, getDivisionSales, getDivisionSalesTotalsFn, getDivisionSalesTotalsYearlyFn, getPendingSaleById, getPendingSales, getPersonalSales, getSaleImagesByTransactionDetail, getSalesBranch, getSalesByDeveloperTotals, getSalesDistributionBySalesTranDtlId, getSalesTrans, getSalesTransactionDetail, getSalesTransDetails, getTotalDivisionSales, getTotalPersonalSales, rejectPendingSale } from "../repository/sales.repository";
import { findAgentDetailsByUserId, findAgentUserById, findBrokerDetailsByUserId, findEmployeeUserById } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";
import { getProjectById } from "../repository/projects.repository";
import { AddPendingSaleDetail, AgentPendingSale, ApproverRole, DivisionYearlySalesGrouped, EditPendingSaleDetail, FnDivisionSalesYearly, IAgentPendingSale, RoleMap, SalesStatusText, SaleStatus } from "../types/sales.types";
import { IAgent, VwAgentPicture } from "../types/users.types";
import { IImage, IImageBase64 } from "../types/image.types";
import path from "path";
import { ITblUsersWeb } from "../types/auth.types";
import { CommissionDetailPositions } from "../types/commission.types";
import { ITblProjects, VwProjectDeveloper } from "../types/projects.types";
import { IBrokerEmailPicture } from "../types/brokers.types";
import { getDevelopers } from "../repository/developers.repository";

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
        search?: string
    },
    pagination?: {
        page?: number, 
        pageSize?: number
    }
): QueryResult<{totalResults: number, totalPages: number, results: Partial<VwSalesTrans>[]}> => {

    const userData = await findEmployeeUserById(userId);

    if(!userData.success){
        return {
            success: false,
            data: {} as {totalResults: number, totalPages: number, results: Partial<VwSalesTrans>[]},
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
            data: {} as {totalResults: number, totalPages: number, results: VwSalesTrans[]},
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
            ProjectName: sale.ProjectName?.trim() || '',
            SalesStatus: sale.SalesStatus?.trim() || '',
            SalesTranCode: sale.SalesTranCode?.trim() || '',
        }
    })

    return {
        success: true,
        data: {
            totalResults: result.data.totalResults,
            totalPages: result.data.totalPages,
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
    if(result.data[0].SalesTransDtlID){
        const data = await getSaleImagesByTransactionDetail(result.data[0].SalesTransDtlID);

        if(data.success){
            images = data.data
        }
    }

    const details = result.data.map((sale: VwSalesTransactions) => {
        return {
            SalesTranDtlId: sale.SalesTransDtlID,
            Position: sale.PositionName?.trim() || '',
            AgentID: sale.AgentID,
            AgentName: sale.AgentName?.trim() || '',
            CommissionRate: sale.CommissionRate
        }
    })

    const data = result.data[0]

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
        LastUpdateby: data.LastUpdateby,
        LastUpdate: data.LastUpdate,
        SalesBranchID: data.SalesBranchID,
        DevCommType: data.DevCommType,
        ProjectName: data.ProjectName,
        DeveloperName: data.DeveloperName,
        Division: data.Division,
        SalesSectorID: data.SalesSectorID,
        SectorName: data.SectorName,
        ProjectTypeName: data.ProjectTypeName
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

    const detailArray = details.data.map((sale: VwSalesTransactions) => {
        return {
            SalesTranDtlId: sale.SalesTransDtlID,
            Position: sale.PositionName?.trim() || '',
            AgentID: sale.AgentID,
            AgentName: sale.AgentName?.trim() || '',
            CommissionRate: sale.CommissionRate
        }
    })

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
            agentCommission: result.data.CommissionRate
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
        details: detailArray,
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

        if(!data.divisionID){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Division is required.',
                    code: 400
                }
            }
        }

        if(!data.images?.receipt || !data.images?.agreement){
            return {
                success: false,
                data: {},
                error: {
                    message: 'Receipt and agreement images are required.',
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

    const updatedData = {
        ...data,
        divisionID: data.divisionID || Number(mobileAgentData.DivisionID),
        property: {
            ...data.property,
            developerID: Number(project.data.DeveloperID),
            developerCommission: Number(data.property.developerCommission)
        },
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        commissionRates: data.commissionRates || []
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

    if(webAgentData && webAgentData.Role === 'SALES ADMIN' && result.success){
        await approvePendingSaleTransaction(webAgentData.UserWebID, result.data.AgentPendingSalesID)
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

    const result = await getPendingSales(
        Number(agentData.data.DivisionID), 
        { 
            ...filters, 
            agentId: agentData.data.Position == 'SALES PERSON' ? Number(agentData.data.AgentID) : undefined,
            approvalStatus: [1,2],
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

    const obj = result.data.results.map((item: AgentPendingSale) => {
        return {
            AgentPendingSalesID: item.AgentPendingSalesID,
            PendingSalesTransCode: item.PendingSalesTranCode,
            SellerName: item.SellerName || 'N/A',
            FinancingScheme: item.FinancingScheme,
            ReservationDate: item.ReservationDate,
            ApprovalStatus: item.ApprovalStatus,
            HasRemark: item.Remarks ? true : false,
            CreatedBy: item.CreatedBy
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

export const getCombinedPersonalSalesService = async (
    user: {
        agentUserId?: number,
        brokerUserId?: number
    }, 
    filters?: { month?: number, year?: number }, 
    pagination?: { page?: number, pageSize?: number }
): QueryResult<any> => {
    console.log("service", user)
    try {

        let agent: VwAgentPicture | undefined = undefined
        let broker: IBrokerEmailPicture | undefined = undefined

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
        
        // Get both approved and pending sales
        const [approvedSalesResult, pendingSalesResult] = await Promise.all([
            // Get approved sales using existing function or create similar one
            getPersonalSales(
                {
                    agentId: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                    brokerName: broker ? broker.RepresentativeName : undefined,

                }, 
                filters
            ),
            // Get pending sales
            getPendingSales(
                undefined,
                {
                    ...filters,
                    agentId: agent ? agent.AgentID ? agent.AgentID : undefined : undefined,
                    brokerName: broker ? broker.RepresentativeName : undefined,
                    isUnique: true
                }
            )
        ]);

        

        let combinedSales: any[] = [];

        // Process approved sales
        if (approvedSalesResult.success) {
            const approvedSales = approvedSalesResult.data.results.map((sale: VwSalesTransactions) => {

                return {
                    salesId: sale.SalesTranID,
                    salesTransDtlId: sale.SalesTransDtlID,
                    pendingSalesId: null,
                    pendingSalesDtlId: null,
                    projectName: sale.ProjectName?.trim() || '',
                    projectCode: sale.SalesTranCode?.trim() || '',
                    agentName: sale.AgentName || '',
                    reservationDate: sale.ReservationDate,
                    dateFiled: sale.DateFiled,
                    approvalStatus: null,
                    hasRemarks: false,
                    isEditable: false
                }
            });
            combinedSales.push(...approvedSales);
        }

        // Process pending sales
        console.log(pendingSalesResult.data)
        if (pendingSalesResult.success) {
            const pendingSales = pendingSalesResult.data.results.map((sale: AgentPendingSale) => {

                let agentRole = agent ? agent.Position : undefined

                const role = RoleMap.get((agent?.Position || 'BROKER').toUpperCase()) || 0

                const isSubmitter = role !== 0 && agent?.AgentID === (sale.CreatedBy)

                if(sale.AgentPendingSalesID == 189){
                    console.log(sale)
                    console.log('role', role)
                    console.log('isSubmitter', isSubmitter)
                }

                return {
                    salesId: null,
                    salesTransDtlId: null,
                    pendingSalesId: sale.AgentPendingSalesID,
                    pendingSalesDtlId: null,
                    projectName: sale.ProjectName?.trim() || '',
                    projectCode: sale.PendingSalesTranCode?.trim() || '',
                    agentName: sale.AgentName || sale.CreatedByName || '',
                    reservationDate: sale.ReservationDate,
                    dateFiled: sale.DateFiled,
                    approvalStatus: sale.ApprovalStatus,
                    hasRemarks: sale.Remarks ? true : false,
                    isEditable: isSubmitter ? role == sale.ApprovalStatus : role == (sale.ApprovalStatus + 1)
                }
            });
            combinedSales.push(...pendingSales);
        }

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

        const result = {
            totalPages: totalPages,
            totalSalesAmount: totalSalesAmount.data,
            sales: paginatedSales
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
        dpStartDate?: Date,
        sellerName?: string,
        images?: {
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: {
            commissionRate: number,
            agentId?: number,
            agentName?: string,
            position: CommissionDetailPositions
        }[]
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

        if(webUserData.data.Role !== 'SALES ADMIN'){
            
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

    const updatedData = {
        ...data,
        ...project && {developerID: Number(project.DeveloperID)},
        ...data.divisionID && {divisionID: data.divisionID},
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        commissionRates: data.commissionRates || []
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
        dpStartDate?: Date,
        sellerName?: string,
        images?: {
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: {
            commissionRate: number,
            agentId?: number,
            agentName?: string,
            position: CommissionDetailPositions
        }[]
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

    const updatedData = {
        ...data,
        ...project && {developerID: Number(project.DeveloperID)},
        ...data.divisionID && {divisionID: data.divisionID},
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        commissionRates: data.commissionRates || []
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
        agentId: agentUserId,
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
    
    const createdBy = await findAgentDetailsByUserId(pendingSale.data.CreatedBy)

    const createdByWeb = await findEmployeeUserById(pendingSale.data.CreatedBy)

    const createdUserId = createdBy.data || createdByWeb.data

    if(!createdBy.success && !createdByWeb.success){
        approvalStatus = SaleStatus.NEWLY_SUBMITTED,
        salesStatus = SalesStatusText.PENDING_UM
    }

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

    if(createdUserId.Position == 'BRANCH HEAD'){
        approvalStatus = SaleStatus.BRANCH_HEAD_APPROVED,
        salesStatus = SalesStatusText.PENDING_SA
    }

    if(createdUserId.Position == 'SALES ADMIN'){
        approvalStatus = SaleStatus.SALES_ADMIN_APPROVED,
        salesStatus = SalesStatusText.APPROVED
    }

    const result = await rejectPendingSale((user.agentUserId || user.webUserId || 0), pendingSalesId, (approvalStatus || 1), (salesStatus || SalesStatusText.PENDING_UM), remarks);

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

    const result = await getPendingSales(
        undefined, 
        { 
            ...filters,
            approvalStatus: role == 'branch sales staff' ? [3] : [4],
            salesBranch: role == 'branch sales staff' ? userData.data.BranchID : undefined,
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

    const obj = result.data.results.map((item: AgentPendingSale) => {
        return {
            AgentPendingSalesID: item.AgentPendingSalesID,
            PendingSalesTransCode: item.PendingSalesTranCode,
            SellerName: item.SellerName || 'N/A',
            FinancingScheme: item.FinancingScheme,
            ReservationDate: item.ReservationDate,
            ApprovalStatus: item.ApprovalStatus,
            CreatedBy: item.CreatedBy
        }
    })

    return {
        success: true,
        data: obj
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

    // Calculate division totals
    const divisionTotals = groupedData.map(division => ({
        division: division.Division,
        monthTotal: division.YearData.reduce((yearSum, yearData) => 
            yearSum + yearData.Months.reduce((monthSum, month) => 
                monthSum + month.CurrentMonth, 0
            ), 0
        )
    }));
    
    return {
        success: true,
        data: {
            divisions: groupedData,
            totals: divisionTotals
        }
    }
}

export const getSalesByDeveloperTotalsFnService = async (userId: number, filters?: {month?: number, year?: number}): QueryResult<any> => {
    const result = await getSalesByDeveloperTotals(
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
    )

    if(!result.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'Failed to get sales by developer totals.',
                code: 400
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}