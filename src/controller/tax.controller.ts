import { Request, Response } from "express";
import { addAgentTaxRateService, deleteAgentTaxRateService, editAgentTaxRateService, getAgentTaxRatesService } from "../service/tax.service";


export const getAgentTaxRatesController = async (req: Request, res: Response) => {

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
        showInactive
    } = req.query

    const result = await getAgentTaxRatesService({ showInactive: showInactive ? true : false })

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to get agent tax rates'})
        return;
    }

    res.status(200).json({success: true, message: 'List of agent tax rates.', data: result.data })

}

export const addAgentTaxRatesController = async (req: Request, res: Response) => {
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
        taxCode,
        taxName,
        vatRate,
        wTaxRate
    } = req.body

    const result = await addAgentTaxRateService(session.userID, { 
        AgentTaxRateCode: taxCode,
        AgentTaxRateName: taxName,
        VATRate: vatRate,
        WtaxRAte: wTaxRate
    })

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to add agent tax rate'})
        return;
    }

    res.status(200).json({success: true, message: 'Agent tax rate added.', data: result.data })
}

export const editAgentTaxRateController = async (req: Request, res: Response) => {
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
        agentTaxRateId
    } = req.params

    const { 
        taxCode,
        taxName,
        vatRate,
        wTaxRate
    } = req.body

    const result = await editAgentTaxRateService(session.userID,  Number(agentTaxRateId), {
        AgentTaxRateCode: taxCode || undefined,
        AgentTaxRateName: taxName || undefined,
        VATRate: Number(vatRate) || undefined,
        WtaxRAte: Number(wTaxRate) || undefined
    })

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to edit agent tax rate'})
        return;
    }

    res.status(200).json({success: true, message: 'Agent tax rate edit.', data: result.data })
}

export const deleteAgentTaxRateController = async (req: Request, res: Response) => {
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
        agentTaxRateId
    } = req.params

    const result = await deleteAgentTaxRateService(session.userID,  Number(agentTaxRateId))

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to delete agent tax rate'})
        return;
    }

    res.status(200).json({success: true, message: 'Agent tax rate deleted.', data: result.data })
}