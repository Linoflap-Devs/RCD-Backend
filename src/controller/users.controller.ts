import { Request, Response } from "express";
import { editAgentEducationService, editAgentImageService, editAgentService, editAgentWorkExpService, getAgentGovIdsService, getUserDetailsService, getUsersService } from "../service/users.service";
import { IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentEducationEditController } from "../types/users.types";

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

export const editAgentEducationController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [] } = req.body; // Default to empty arrays

    const result = await editAgentEducationService(session.userID, edit, create);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit user education'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'User education edited' });
};

export const editAgentWorkExpController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [] } = req.body; // Default to empty arrays

    const result = await editAgentWorkExpService(session.userID, edit, create);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit user work exp'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'User work exp edited' });
};