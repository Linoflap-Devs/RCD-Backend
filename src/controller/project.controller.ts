import { Request, Response } from "express";
import { getProjectDetailsService, getProjectListService } from "../service/projects.service";

export const getProjectListController = async (req: Request, res: Response) => {

    const result = await getProjectListService();

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get project list.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'List of projects.', data: result.data})
}

export const getProjectDetailsController = async (req: Request, res: Response) => {

    const { projectId } = req.params

    const result = await getProjectDetailsService(Number(projectId));

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get project details.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Project details.', data: result.data})

}