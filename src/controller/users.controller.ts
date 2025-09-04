import { Request, Response } from "express";
import { editAgentService, getUserDetailsService, getUsersService } from "../service/users.service";
import { IAgentEdit } from "../types/users.types";

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