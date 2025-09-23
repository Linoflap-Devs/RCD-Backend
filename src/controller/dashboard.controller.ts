import { Request, Response } from "express";
import { getAgentDashboard, getWebDashboardService } from "../service/dashboard.service";

export const getAgentDashboardController = async (req: Request, res: Response) => {
    const session = req.session
    if(!session) {
        res.status(401).json({
            success: false, 
            message: 'Unauthorized',
            data: {}, 
        })
        return;
    }

    if(!session.userID) {
        res.status(401).json({
            success: false, 
            message: 'Unauthorized',
            data: {}, 
        })
        return;
    }

    const { month, year } = req.query

    const result = await getAgentDashboard(
        session.userID, 
        {
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined
        }
    )

    return res.status(200).json({
        success: true, 
        message: 'Agent dashboard.',
        data: result, 
    })
}

export const getWebDashboardController = async (req: Request, res: Response) => {
    const result = await getWebDashboardService()

    if(!result.success) {
        return res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get web dashboard', data: {}}) 
    }

    return res.status(200).json({success: true, message: 'Web dashboard.', data: result.data})
}