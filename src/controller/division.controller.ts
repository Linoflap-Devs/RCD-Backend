import { Request, Response } from "express";
import { activateDivisionService, addDivisionRequestService, addDivisionService, deleteDivisionService, editDivisionService, getDivisionHierarchyService, getDivisionRequestDetailsService, getDivisionRequestsService, getDivisionsService, getTop10DivisionService } from "../service/division.service";

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

        return
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

export const activateDivisionController = async (req: Request, res: Response) => {
    const session = req.session

    // const { divisionID } = req.body
    const { divisionId } = req.params

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await activateDivisionService(session.userID, Number(divisionId))

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to activate division.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true,
        message: "Division activated.",
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

export const getDivisionRequestsController = async (req: Request, res: Response) => {

    const session = req.session

    const {
        showInactive,
        showApproved,
        agentId,
        page,
        pageSize
    } = req.query

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getDivisionRequestsService(
        session.userID,
        {
            agentId: agentId ? Number(agentId) : undefined,
            showInactive: showInactive ? showInactive === 'true' : undefined,
            showApproved: showApproved ? showApproved === 'true' : undefined
        },
        {
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined
        }
    )

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to get division requests.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true,
        message: "Division requests.",
        data: result.data
    })
}

export const getDivisionRequestDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { divisionRequestId } = req.params

    const result = await getDivisionRequestDetailsService(
        session.userID,
        Number(divisionRequestId)
    )

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to get division requests.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true,
        message: "Division request details.",
        data: result.data
    })
}

export const addDivisionRequestController = async (req: Request, res: Response) => {

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
        divisionId,
        unitManagerId
    } = req.body


    const result = await addDivisionRequestService(session.userID, Number(divisionId), Number(unitManagerId))

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false,
            message: result.error?.message || "Failed to add division request.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true,
        message: "Division request added.",
        data: result.data
    })
}