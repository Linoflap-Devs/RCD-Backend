import { QueryResult } from "../types/global.types"
import { db } from "../db/db"
import { VwProjects } from "../db/db-types"

// export const getProjectList = async (): QueryResult<VwProjects[]> => {

//     try {
//         const result = await db.selectFrom('Vw_Projects')
//         .selectAll()
//         .execute();

//         return {
//             success: true,
//             data: result
//         };
//     }

//     catch (err: unknown){
//         const error = err as Error;
//         return {
//             success: false,
//             data: [] as VwProjects[],
//             error: {
//                 code: 500,
//                 message: error.message
//             }
//         }
//     }
// }

export const getProjectById = async (projectId: number): QueryResult<VwProjects> => {

    try {
        const result = await db.selectFrom('vw_Projects')
        .selectAll()
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
            data: {} as VwProjects,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}