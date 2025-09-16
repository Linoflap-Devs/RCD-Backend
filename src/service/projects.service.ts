import { TblProjects, VwProjects } from "../db/db-types";
import { getProjectList } from "../repository/projects.repository";
import { QueryResult } from "../types/global.types";

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