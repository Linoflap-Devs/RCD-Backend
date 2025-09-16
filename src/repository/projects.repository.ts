import { QueryResult } from "../types/global.types"
import { db } from "../db/db"
import { VwProjects } from "../db/db-types"
import { VwProjectDeveloper } from "../types/projects.types";

export const getProjectList = async (): QueryResult<VwProjects[]> => {

    try {
        const result = await db.selectFrom('vw_Projects')
        .selectAll()
        .execute();

        return {
            success: true,
            data: result
        };
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as VwProjects[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getProjectById = async (projectId: number): QueryResult<VwProjectDeveloper> => {

    try {
        const result = await db.selectFrom('vw_Projects')
        .innerJoin('Tbl_Developers', 'Tbl_Developers.DeveloperID', 'vw_Projects.DeveloperID')
        .select([
            // Project fields
            'vw_Projects.ProjectID',
            'vw_Projects.ProjectName',
            'vw_Projects.ProjectCode',
            'vw_Projects.Address',
            'vw_Projects.ContactNumber',
            'vw_Projects.DeveloperID',
            'vw_Projects.DeveloperName',
            'vw_Projects.IsLeadProject',
            'vw_Projects.LastUpdate',
            'vw_Projects.ProjectTypeID',
            'vw_Projects.ProjectTypeName',
            'vw_Projects.SectorID',
            'vw_Projects.SectorName',
            'vw_Projects.UpdateBy',
            // Developer fields
            'Tbl_Developers.CommRate',
            'Tbl_Developers.ContactPerson',
            'Tbl_Developers.DeveloperCode',
            'Tbl_Developers.PartialReleaseAmount',
            'Tbl_Developers.PartialReleaseType',
            'Tbl_Developers.Position',
            'Tbl_Developers.ReleaseSchedule',
            'Tbl_Developers.TaxIDNumber',
            'Tbl_Developers.VATRate',
            'Tbl_Developers.WtaxRate'
        ])
        .where("ProjectID", "=", projectId)
        .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as VwProjectDeveloper,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}