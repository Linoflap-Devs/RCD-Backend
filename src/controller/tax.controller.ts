import { Request, Response } from "express";
import { getAgentTaxRatesService } from "../service/tax.service";


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