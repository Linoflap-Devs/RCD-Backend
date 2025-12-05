import { Request, Response } from "express";
import { addAgentTaxRateService, getAgentTaxRatesService } from "../service/tax.service";


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

    const result = await getAgentTaxRatesService()

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