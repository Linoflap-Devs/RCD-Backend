import { VwSalesTransactions } from "../db/db-types";
import { addPendingSale, approveNextStage, approvePendingSaleTransaction, editPendingSalesDetails, editSaleImages, getDivisionSales, getPendingSaleById, getPendingSales, getPersonalSales, getSaleImagesByTransactionDetail, getSalesBranch, getSalesTransactionDetail, getTotalDivisionSales, getTotalPersonalSales, rejectPendingSale } from "../repository/sales.repository";
import { findAgentDetailsByUserId, findEmployeeUserById } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";
import { getProjectById } from "../repository/projects.repository";
import { AddPendingSaleDetail, AgentPendingSale, ApproverRole, EditPendingSaleDetail, IAgentPendingSale, SalesStatusText, SaleStatus } from "../types/sales.types";
import { IAgent } from "../types/users.types";
import { IImage } from "../types/image.types";
import path from "path";

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

    const images = await getSaleImagesByTransactionDetail(salesTransDtlId);

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
        images: images.data
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
        },
        images?: {
            receipt?: Express.Multer.File,
            agreement?: Express.Multer.File,
        },
        commissionRates?: AddPendingSaleDetail[]
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

    const updatedData = {
        ...data,
        divisionID: Number(agentData.data.DivisionID),
        property: {
            ...data.property,
            developerID: Number(project.data.DeveloperID)
        },
        images: {
            receipt: receiptMetadata,
            agreement: agreementMetadata
        },
        commissionRates: data.commissionRates || []
    }

    const result = await addPendingSale(agentData.data.AgentID, (agentData.data.Position || ''), updatedData)

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
    userId: number, 
    filters?: { month?: number, year?: number }, 
    pagination?: { page?: number, pageSize?: number }
): QueryResult<any> => {
    try {
        const agent = await findAgentDetailsByUserId(userId);
        
        if (!agent.data.AgentID) {
            return {
                success: false,
                data: [],
                error: {
                    code: 500,
                    message: 'No agent found.'
                }
            };
        }

        if (!agent.data.DivisionID) {
            return {
                success: false,
                data: [],
                error: {
                    code: 500,
                    message: 'No division found.'
                }
            };
        }

        // Get both approved and pending sales
        const [approvedSalesResult, pendingSalesResult] = await Promise.all([
            // Get approved sales using existing function or create similar one
            getPersonalSales(agent.data.AgentID, filters),
            // Get pending sales
            getPendingSales(
                undefined,
                {
                    ...filters,
                    agentId: agent.data.AgentID,
                    isUnique: true
                }
            )
        ]);

        

        let combinedSales: any[] = [];

        // Process approved sales
        if (approvedSalesResult.success) {
            const approvedSales = approvedSalesResult.data.results.map((sale: VwSalesTransactions) => ({
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
            }));
            combinedSales.push(...approvedSales);
        }

        // Process pending sales
        console.log(pendingSalesResult.data)
        if (pendingSalesResult.success) {
            const pendingSales = pendingSalesResult.data.results.map((sale: AgentPendingSale) => ({
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
            }));
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

        const totalSalesAmount = await getTotalPersonalSales(agent.data.AgentID, { month: filters?.month, year: filters?.year });

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
            salesBranch: userData.data.BranchID,
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

    if(pendingSale.data.SalesBranchID != agentUserId){
        return {
            success: false,
            data: {},
            error: {
                message: 'This sale does not belong to you.',
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

    const result = await editSaleImages(pendingSalesId, undefined, receiptImg, agreementImg) 

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