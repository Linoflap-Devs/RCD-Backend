import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { IAgent } from "../types/users.types";

export const getAgents = async (filters?: { showInactive?: boolean, division?: number }): QueryResult<IAgent[]> => {
    try {
        let result = await db.selectFrom('Tbl_Agents')
            .selectAll()

        if(filters && filters.division){
            result = result.where('DivisionID' , '=', filters.division.toString())
        }

        if(!filters || !filters.showInactive){
            result = result.where('IsActive', '=', 1)
        }

        const queryResult = await result.execute();

        if(!queryResult){
            throw new Error('No agents found.');
        }

        return {
            success: true,
            data: queryResult
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as IAgent[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}