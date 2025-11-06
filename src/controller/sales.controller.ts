import { Request, Response } from "express"
import { addPendingSalesService, approveBranchHeadService, approvePendingSaleService, approveSalesAdminService, approveSalesDirectorService, editPendingSaleImagesService, editPendingSalesDetailsService, editPendingSaleService, getCombinedPersonalSalesService, getPendingSalesDetailService, getPendingSalesService, getSalesTransactionDetailService, getUserDivisionSalesService, getUserPersonalSalesService, getWebPendingSalesDetailService, getWebPendingSalesService, getWebSalesTranDtlService, getWebSalesTransService, rejectPendingSaleService } from "../service/sales.service";
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

export const getWebSalesTransController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { page, pageSize, month, year, developerId } = req.query

    const result = await getWebSalesTransService(session.userID, {
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        developerId: developerId ? Number(developerId) : undefined
    }, {
        page: Number(page), 
        pageSize: Number(pageSize)
    })

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get sales transactions', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'List of sales transactions.', data: result.data})
    
}

export const getWebSalesTransDtlController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { salesTransactionId } = req.params

    const result = await getWebSalesTranDtlService(session.userID, Number(salesTransactionId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get sales transaction detail', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales transaction detail', data: result.data})
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

export const getWebPendingSalesController = async (req: Request, res: Response) => {
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

    const { page, pageSize, month, year, developerId } = req.query

    const result = await getWebPendingSalesService(session.userID, {
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

export const getWebPendingSalesDetailsController = async (req: Request, res: Response) => {

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

    const result = await getWebPendingSalesDetailService(Number(session.userID), Number(pendingSalesId))

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
    console.log(req.query)

    const result = await getCombinedPersonalSalesService(
        session.userID, 
        {
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined
        },
        {
            page: page ? Number(page) : 1, 
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

    const images = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

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
        sellerName,
        commissionRates
    } = req.body

    let parsedCommissionRates = [];
    if (commissionRates) {
        try {
            parsedCommissionRates = JSON.parse(commissionRates);
        } catch (error) {
            // Try parsing double-escaped JSON
            try {
                const unescaped = commissionRates.replace(/\\\"/g, '"');
                parsedCommissionRates = JSON.parse(unescaped);
            } catch (innerError) {
                res.status(400).json({
                    success: false, 
                    message: 'Invalid commissionRates format', 
                    data: {}
                });
                return;
            }
        }
    }

    const result = await addPendingSalesService(
        {
            agentUserId: session.userID
        }, 
        {
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
        },
        images: {
            receipt: images?.receipt ? images.receipt[0] : undefined,
            agreement: images?.agreement ? images.agreement[0] : undefined
        },
        commissionRates: parsedCommissionRates ? parsedCommissionRates : [],
    })

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales added', data: result.data})
}

export const addWebPendingSaleController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    const images = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    const {
        reservationDate,
        salesBranchID,
        sectorID,
        divisionID,
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
        sellerName,
        commissionRates
    } = req.body

    let parsedCommissionRates = [];
    if (commissionRates) {
        try {
            parsedCommissionRates = JSON.parse(commissionRates);
        } catch (error) {
            // Try parsing double-escaped JSON
            try {
                const unescaped = commissionRates.replace(/\\\"/g, '"');
                parsedCommissionRates = JSON.parse(unescaped);
            } catch (innerError) {
                res.status(400).json({
                    success: false, 
                    message: 'Invalid commissionRates format', 
                    data: {}
                });
                return;
            }
        }
    }

    const result = await addPendingSalesService(
        {
            webUserId: session.userID
        }, 
        {
        reservationDate,
        divisionID,
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
        },
        images: {
            receipt: images?.receipt ? images.receipt[0] : undefined,
            agreement: images?.agreement ? images.agreement[0] : undefined
        },
        commissionRates: parsedCommissionRates ? parsedCommissionRates : [],
    })

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales added', data: result.data})
}

export const editPendingSalesControllerV2 = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    const images = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    const {
        reservationDate,
        salesBranchID,
        sectorID,
        divisionID,
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
        sellerName,
        commissionRates
    } = req.body

    const {
        pendingSalesId
    } = req.params

    let parsedCommissionRates = [];
    if (commissionRates) {
        try {
            parsedCommissionRates = JSON.parse(commissionRates);
        } catch (error) {
            // Try parsing double-escaped JSON
            try {
                const unescaped = commissionRates.replace(/\\\"/g, '"');
                parsedCommissionRates = JSON.parse(unescaped);
            } catch (innerError) {
                res.status(400).json({
                    success: false, 
                    message: 'Invalid commissionRates format', 
                    data: {}
                });
                return;
            }
        }
    }

    const result = await editPendingSaleService(
        {
            agentUserId: session.userID
        }, 
        {
            pendingSalesId: Number(pendingSalesId),
            reservationDate,
            divisionID,
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
            developerCommission,
            netTCP,
            miscFee,
            financingScheme,
            downpayment,
            dpTerms,
            monthlyPayment,
            dpStartDate,
            sellerName,
            images: {
                receipt: images?.receipt ? images.receipt[0] : undefined,
                agreement: images?.agreement ? images.agreement[0] : undefined
            },
            commissionRates: parsedCommissionRates ? parsedCommissionRates : [],
        }
    )

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales edited', data: result.data})
}

export const editWebPendingSalesControllerV2 = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    const images = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    const {
        reservationDate,
        salesBranchID,
        sectorID,
        divisionID,
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
        sellerName,
        commissionRates
    } = req.body

    const { 
        pendingSalesId
    } = req.params

    let parsedCommissionRates = [];
    if (commissionRates) {
        try {
            parsedCommissionRates = JSON.parse(commissionRates);
        } catch (error) {
            // Try parsing double-escaped JSON
            try {
                const unescaped = commissionRates.replace(/\\\"/g, '"');
                parsedCommissionRates = JSON.parse(unescaped);
            } catch (innerError) {
                res.status(400).json({
                    success: false, 
                    message: 'Invalid commissionRates format', 
                    data: {}
                });
                return;
            }
        }
    }

    const result = await editPendingSaleService(
        {
            webUserId: session.userID
        }, 
        {
            pendingSalesId: Number(pendingSalesId),
            reservationDate,
            divisionID,
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
            developerCommission,
            netTCP,
            miscFee,
            financingScheme,
            downpayment,
            dpTerms,
            monthlyPayment,
            dpStartDate,
            sellerName,
            images: {
                receipt: images?.receipt ? images.receipt[0] : undefined,
                agreement: images?.agreement ? images.agreement[0] : undefined
            },
            commissionRates: parsedCommissionRates ? parsedCommissionRates : [],
        }
)

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales edited', data: result.data})
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

export const approvePendingSalesSDController = async (req: Request, res: Response) => {
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

    const result = await approveSalesDirectorService(session.userID, Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to approve sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales approved', data: result.data})
}

export const approvePendingSalesBHController = async (req: Request, res: Response) => {
    const session = req.session

    const { pendingSalesId } = req.params

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await approveBranchHeadService(session.userID, Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to approve sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales approved', data: result.data})
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

    const result = await rejectPendingSaleService({ agentUserId: session.userID }, Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to reject sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales rejected', data: result.data})
}

export const rejectWebPendingSalesController = async (req: Request, res: Response) => {
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

    const result = await rejectPendingSaleService({ webUserId: session.userID }, Number(pendingSalesId))

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

    const result = await approveSalesAdminService(session.userID, Number(pendingSalesId))

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to approve sales', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales approved', data: result.data})
}

export const editSaleImagesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const images = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    const { pendingSalesId } = req.params

    const result = await editPendingSaleImagesService(
        Number(pendingSalesId), 
        {
            receipt: images?.receipt ? images.receipt[0] : undefined, 
            agreement: images?.agreement ? images.agreement[0] : undefined
        }, 
        session.userID
    )

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to edit sales images', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Sales images edited', data: result.data})
}