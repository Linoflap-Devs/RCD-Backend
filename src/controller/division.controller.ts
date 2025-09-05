import { Request, Response } from "express";
import { getDivisionHierarchyService } from "../service/division.service";

export const getAgentHierarchyController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }
    
    const result = await getDivisionHierarchyService(session.userID)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to get user hierarchy.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true,
        message: "Agent hierarchy.",
        data: result.data
    })
}