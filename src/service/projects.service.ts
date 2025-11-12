import { TblProjects, VwProjects } from "../db/db-types";
import { getDevelopers } from "../repository/developers.repository";
import { addProject, getProjectById, getProjectList, getProjectTypes } from "../repository/projects.repository";
import { getSectors } from "../repository/sectors.repository";
import { QueryResult } from "../types/global.types";
import { IAddProject, ITblProjects } from "../types/projects.types";
import { logger } from "../utils/logger";

export const getProjectListService = async (): QueryResult<any> => {
    const result = await getProjectList();

    if(!result.success){
        return {
            success: false,
            data: {} as any,
            error: result.error
        }
    }
    
    // process result
    const formatted = result.data.map((project: VwProjects) => {
        return {
            projectId: project.ProjectID,
            projectName: project.ProjectName.trim(),
            projectCode: project.ProjectCode.trim(),
            developer: project.DeveloperName?.trim() || 'N/A',
        }
    })

    return {
        success: true,
        data: formatted
    }
}

export const getProjectDetailsService = async (projectId: number): QueryResult<any> => {
    const result = await getProjectById(projectId)

    if(!result.success){
        return {
            success: false,
            data: {} as VwProjects,
            error: result.error
        }
    }

    logger('getProjectDetailsService', {data: result.data})

    const formatted = {
        address: result.data.Address.trim(),
        contactNumber: result.data.ContactNumber.trim(),
        developerID: result.data.DeveloperID,
        developerName: result.data.DeveloperName?.trim() || 'N/A',
        isLeadProject: result.data.IsLeadProject,
        lastUpdate: result.data.LastUpdate,
        projectCode: result.data.ProjectCode.trim(),
        projectID: result.data.ProjectID,
        projectName: result.data.ProjectName.trim(),
        projectTypeID: result.data.ProjectTypeID,
        projectTypeName: result.data.ProjectTypeName?.trim() || 'N/A',
        sectorID: result.data.SectorID,
        sectorName: result.data.SectorName.trim(),
        updateBy: result.data.UpdateBy,
        developerCode: result.data.DeveloperCode,
        developerCommissionRate: result.data.CommRate || 0
    }

    return {
        success: true,
        data: formatted
    }
}

export const addProjectService = async (userId: number, data: IAddProject): QueryResult<ITblProjects> => {

    // check ids
    const projectType = await getProjectTypes({projectTypeId: data.ProjectTypeID})

    if(!projectType.success || projectType.data.length == 0){
        return {
            success: false,
            data: {} as ITblProjects,
            error: {
                code: 404,
                message: 'Invalid project type id.'
            }
        }
    }

    const developer = await getDevelopers({developerId: data.DeveloperID})

    if(!developer.success || developer.data.data.length == 0){
        return {
            success: false,
            data: {} as ITblProjects,
            error: {
                code: 404,
                message: 'Invalid developer id.'
            }
        }
    }

    const sector = await getSectors({sectorId: data.SectorID})

    if(!sector.success || sector.data.length == 0){
        return {
            success: false,
            data: {} as ITblProjects,
            error: {
                code: 404,
                message: 'Invalid sector id.'
            }
        }
    }

    const existing = await getProjectList({projectCode: data.ProjectCode})

    if(existing.data.length > 0){
        return {
            success: false,
            data: {} as ITblProjects,
            error: {
                code: 400,
                message: 'Project code already exists.'
            }
        }
    }

    const result = await addProject(userId, data)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblProjects,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}