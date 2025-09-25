import { Request, Response } from "express";
import { getAgentCommissionDetailsService, getAgentCommissionsService, getCommissionForecastService } from "../service/commission.service";

export const getAgentCommissionController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { month, year } = req.query

    const result = await getAgentCommissionsService(session.userID, {month: Number(month), year: Number(year)});

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent commissions', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent commissions', data: result.data})
}

export const getAgentCommissionDetailsController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { date } = req.params

    const result = await getAgentCommissionDetailsService(session.userID, new Date(date));

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent commission details', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent commission details', data: result.data})
}

export const getCommissionForecastController = async (req: Request, res: Response) => {
    const { date } = req.query

    let query = undefined
    if(date){
        const convert = new Date(date.toString())

        if(convert){
            query = convert
        }
    }

    const result = await getCommissionForecastService(query)

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get commission forecast', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Commission forecast', data: result.data})
}