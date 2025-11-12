import { Request, Response } from "express";
import { addProjectService, getProjectDetailsService, getProjectListService } from "../service/projects.service";

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

export const addProjectController = async (req: Request, res: Response) => {
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
        projectCode,
        projectName,
        developerId,
        projectTypeId,
        sectorId,
        contactNumber,
        address,
        isLeadProject
    } = req.body

    const result = await addProjectService(
        Number(session.userID),
        {
            ProjectCode: projectCode,
            ProjectName: projectName,
            DeveloperID: Number(developerId),
            ProjectTypeID: Number(projectTypeId),
            SectorID: Number(sectorId),
            ContactNumber: contactNumber,
            Address: address,
            IsLeadProject: isLeadProject 
        }
    )

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add project.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Project added.', data: result.data})
}