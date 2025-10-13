import { Request, Response } from "express";
import { getDivisionHierarchyService, getTop10DivisionService } from "../service/division.service";

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

export const getTop10DivisionsController = async (req: Request, res: Response) => {

    const { date } = req.query

    let query = undefined
    if(date){
        const convert = new Date(date.toString())

        if(convert){
            query = convert
        }
    }

    const result = await getTop10DivisionService(query)

    if(!result.success){
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get divisions', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Top 10 divisions', data: result.data})

}