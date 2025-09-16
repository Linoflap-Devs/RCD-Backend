import { Request, Response } from "express";
import { getSalesBranchesService } from "../service/branches.service";

export const getBranchesController = async (req: Request, res: Response) => {

    const result = await getSalesBranchesService();

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get branches.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'List of branches.', data: result.data})
}