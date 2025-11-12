import { Request, Response } from "express";
import { addDeveloperService, editDeveloperService, getDevelopersService } from "../service/developers.service";

export const getDevelopersController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        developerId,
        page,
        pageSize
    } = req.query

    const result = await getDevelopersService(
        session.userID, 
        {
            developerId: developerId ? Number(developerId) : undefined
        },
        {   
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined
        }
    )

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get developers', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Developers', data: result.data})
}

export const addDeveloperController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        developerCode,
        developerName,
        contactPerson,
        contactNumber,
        position,
        address,
        partialReleaseType,
        releaseAmount,
        vatRate,
        wTaxRate,
        commRate,
        releaseSchedule,
        taxIdNumber
    } = req.body

    const result = await addDeveloperService(session.userID, {
        developerCode,
        developerName,
        contactPerson,
        contactNumber,
        position,
        address,
        partialReleaseType,
        releaseAmount: Number(releaseAmount),
        valueAddedTaxRate: Number(vatRate),
        withholdingTaxRate: Number(wTaxRate),
        commissionRate: Number(commRate),
        commissionSchedule: releaseSchedule,
        taxIdNumber
    })

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add developer', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Developer added', data: result.data})
}

export const editDeveloperController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { developerId } = req.params

    const {
        developerCode,
        developerName,
        contactPerson,
        contactNumber,
        position,
        address,
        partialReleaseType,
        releaseAmount,
        vatRate,
        wTaxRate,
        commRate,
        releaseSchedule,
        taxIdNumber
    } = req.body

    const result = await editDeveloperService(
        session.userID, 
        Number(developerId),
        {
            DeveloperCode: developerCode,
            DeveloperName: developerName,
            ContactPerson: contactPerson,
            ContactNumber: contactNumber,
            Position: position,
            Address: address,
            PartialReleaseType: partialReleaseType ? 1 : 0,
            PartialReleaseAmount: releaseAmount ? Number(releaseAmount) : undefined,
            VATRate: vatRate ? Number(vatRate) : undefined,
            WtaxRate: wTaxRate ? Number(wTaxRate) : undefined,
            CommRate: commRate ? Number(commRate) : undefined,
            ReleaseSchedule: releaseSchedule,
            TaxIDNumber: taxIdNumber
        }
    )

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to edit developer', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Developer edited.', data: result.data})
}