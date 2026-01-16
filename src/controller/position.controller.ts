import { Request, Response } from "express";
import { getPositionsService } from "../service/position.service";
export const getPositionsController = async (req: Request, res: Response) => {

    const result = await getPositionsService();

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get positions list.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'List of positions.', data: result.data})
}