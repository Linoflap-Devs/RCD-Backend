import { Request, Response } from "express";
import { getAgentDashboard } from "../service/dashboard.service";

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

    const result = await getAgentDashboard(session.userID)

    return res.status(200).json({
        success: true, 
        message: 'Agent dashboard.',
        data: result, 
    })
}