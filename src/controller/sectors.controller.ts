import { Request, Response } from "express";
import { getSectorsService } from "../service/sectors.service";

export const getSectorsController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getSectorsService()

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to get sectors'})
        return;
    }

    res.status(200).json({success: true, message: 'List of sectors', data: result.data })

}