import { Request, Response } from "express";
import { addDivisionService, deleteDivisionService, editDivisionService, getDivisionHierarchyService, getDivisionsService, getTop10DivisionService } from "../service/division.service";

export const getDivisionsController = async (req: Request, res: Response) => {

    const result = await getDivisionsService()

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to get divisions.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true,
        message: "List of divisions.",
        data: result.data
    })
}

export const addDivisionController = async  (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { divisionCode, divisionName, directorId } = req.body

    const result = await addDivisionService(session.userID, { DivisionCode: divisionCode, Division: divisionName, DirectorId: directorId })

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to add division.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true,
        message: "Division added.",
        data: result.data
    })
}

export const editDivisionController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { divisionId } = req.params
    const { divisionCode, divisionName, directorId } = req.body

    const result = await editDivisionService(session.userID, Number(divisionId), { DivisionCode: divisionCode, Division: divisionName, DirectorId: directorId })

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to edit division.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true,
        message: "Division edited.",
        data: result.data
    })
}

export const deleteDivisionController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { divisionId } = req.params

    const result = await deleteDivisionService(session.userID, Number(divisionId))

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to delete division.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true,
        message: "Division deleted.",
        data: result.data
    })
}

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