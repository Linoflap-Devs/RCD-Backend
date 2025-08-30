import { Request, Response } from "express";
import { getUsersService } from "../service/users.service";

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