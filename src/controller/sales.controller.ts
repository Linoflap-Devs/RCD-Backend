import { Request, Response } from "express"
import { addPendingSalesService, approvePendingSaleService, editPendingSalesDetailsService, getCombinedPersonalSalesService, getPendingSalesDetailService, getPendingSalesService, getSalesTransactionDetailService, getUserDivisionSalesService, getUserPersonalSalesService, rejectPendingSaleService } from "../service/sales.service";
import { logger } from "../utils/logger";

export const getDivisionSalesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { page, pageSize, month, year } = req.query

    const result = await getUserDivisionSalesService(
        session.userID, 
        {
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined
        }, 
        {
            page: Number(page), 
            pageSize: Number(pageSize)
        }
    )

    res.status(200).json({success: true, message: 'List of division sales', data: result.data})
}

export const getPersonalSalesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { page, pageSize, month, year } = req.query

    const result = await getUserPersonalSalesService(
        session.userID, 
        {
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined
        },
        {
            page: Number(page), 
            pageSize: Number(pageSize)
        }
    )

    res.status(200).json({success: true, message: 'List of division sales', data: result.data})
}

export const getSalesTransactionDetailController = async (req: Request, res: Response) => {
    const { salesTransactionId } = req.params

    const result = await getSalesTransactionDetailService(Number(salesTransactionId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get sales transaction detail', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Sales transaction detail', data: result.data})
}

export const getPendingSalesController = async (req: Request, res: Response) => {
    logger('getPendingSalesController')
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { page, pageSize, month, year, agentId, developerId } = req.query

    const result = await getPendingSalesService(session.userID, {
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        developerId: developerId ? Number(developerId) : undefined
    }, {
        page: Number(page), 
        pageSize: Number(pageSize)
    })

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get pending sales', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Pending sales', data: result.data})
}

export const getPendingSalesDetailsController = async (req: Request, res: Response) => {

    const { pendingSalesId } = req.params

    const result = await getPendingSalesDetailService(Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get pending sales detail', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Pending sales detail', data: result.data})

}

export const getCombinedPersonalSalesController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { page, pageSize, month, year, } = req.query

    const result = await getCombinedPersonalSalesService(
        session.userID, 
        {
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined
        },
        {
            page: page ? Number(page) : undefined, 
            pageSize:  pageSize ? Number(pageSize) : undefined
        }
    )

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get combined personal sales', data: {}})
        return
    }

    return res.status(200).json({success: true, message: 'Combined personal sales.', data: result.data})
}

export const addPendingSaleController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        reservationDate,
        salesBranchID,
        sectorID,
        buyersName,
        address,
        phoneNumber,
        occupation,
        projectID,
        blkFlr,
        lotUnit,
        phase,
        lotArea,
        flrArea,
        developerID,
        developerCommission,
        netTCP,
        miscFee,
        financingScheme,
        downpayment,
        dpTerms,
        monthlyPayment,
        dpStartDate,
        sellerName
    } = req.body

    const result = await addPendingSalesService(session.userID, {
        reservationDate,
        salesBranchID,
        sectorID,
        buyer: {
            buyersName,
            address,
            phoneNumber,
            occupation
        },
        property: {
            projectID,
            blkFlr,
            lotUnit,
            phase,
            lotArea,
            flrArea,
            developerCommission,
            netTCP,
            miscFee,
            financingScheme
        },
        payment: {
            downpayment,
            dpTerms,
            monthlyPayment,
            dpStartDate,
            sellerName
        }
    })

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales added', data: result.data})
}

export const editPendingSalesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { pendingSalesId } = req.params
    const { edit = [] } = req.body

    const result = await editPendingSalesDetailsService(session.userID, Number(pendingSalesId), edit)

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to edit sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales edited', data: result.data})
}

export const rejectPendingSalesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { pendingSalesId } = req.params

    const result = await rejectPendingSaleService(session.userID, Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to reject sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales rejected', data: result.data})
}

export const approvePendingSalesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { pendingSalesId } = req.params

    const result = await approvePendingSaleService(session.userID, Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to approve sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales approved', data: result.data})
}