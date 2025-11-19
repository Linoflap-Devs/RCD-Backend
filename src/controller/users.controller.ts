import { Request, Response } from "express";
import { editAgentEducationService, editAgentImageService, editAgentService, editAgentWorkExpService, editBrokerEducationService, editBrokerImageService, getAgentGovIdsService, getBrokerDetailsService, getBrokersService, getUserDetailsService, getUserDetailsWithValidationService, getUsersService, top10SPsService, top10UMsService } from "../service/users.service";
import { IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentEducationEditController } from "../types/users.types";
import { QueryResult } from "../types/global.types";

export const getUsersController = async (req: Request, res: Response) => {
    const result = await getUsersService();
    
    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get users.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "List of users.",
        data: result
    });
};

export const getAgentUserDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getUserDetailsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "User details.",
        data: result.data
    });
}

export const getBrokerUserDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getBrokerDetailsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get broker details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Broker details.",
        data: result.data
    });
}

export const getAgentGovIdsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getAgentGovIdsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user gov ids.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Agent government IDs.",
        data: result.data
    })
}

export const findAgentByAgentIdController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentId } = req.params

    const result = await getUserDetailsWithValidationService(Number(session.userID), Number(agentId))

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: `User details for Agent ID ${agentId}.`,
        data: result.data
    })
}

export const editAgentDetailsController = async (req: Request, res: Response) => {

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
        firstName,
        lastName,
        middleName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber
    } = req.body

    const obj: IAgentEdit = {
        firstName,
        lastName,
        middleName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber
    }

    const result = await editAgentService(session.userID, obj)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to edit user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "User details.",
        data: result.data
    });
}

export const editAgentImageController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    
    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    if(!profileImage){
        res.status(400).json({success: false, data: {}, message: 'Image not found'})
        return
    }

    const result = await editAgentImageService(session.userID, profileImage.profileImage[0])

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to edit user image'})
        return;
    }

    res.status(200).json({success: true, data: result.data, message: 'User image edited'})
}

export const editBrokerImageController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    
    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    if(!profileImage){
        res.status(400).json({success: false, data: {}, message: 'Image not found'})
        return
    }

    const result = await editBrokerImageService(session.userID, profileImage.profileImage[0])

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to edit user image'})
        return;
    }

    res.status(200).json({success: true, data: result.data, message: 'User image edited'})
}

export const editAgentEducationController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editAgentEducationService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit user education'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'User education edited' });
};

export const editBrokerEducationController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editBrokerEducationService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit broker education'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'Broker education edited' });
};

export const editAgentWorkExpController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editAgentWorkExpService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit user work exp'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'User work exp edited' });
};

export const getBrokersController = async (req: Request, res: Response) => {
    const result = await getBrokersService()

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get brokers.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Brokers.",
        data: result.data
    });
}

export const getTop10UMsController = async (req: Request, res: Response) => {
    const { date } = req.query

    let query = undefined
    if(date){
        const convert = new Date(date.toString())

        if(convert){
            query = convert
        }
    }

    const result = await top10UMsService(query)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get top 10 UMs.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Top 10 UMs.",
        data: result.data
    });
}

export const getTop10SPsController = async (req: Request, res: Response) => {
    const { date } = req.query

    let query = undefined
    if(date){
        const convert = new Date(date.toString())

        if(convert){
            query = convert
        }
    }

    const result = await top10SPsService(query)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get top 10 SPs.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Top 10 SPs.",
        data: result.data
    });
}
