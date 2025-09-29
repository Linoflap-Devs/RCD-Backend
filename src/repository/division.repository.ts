import { QueryResult } from "../types/global.types"
import { db } from "../db/db"
import { VwAgents } from "../db/db-types"


export const getDivisionAgents = async (agentId: number, divisionId: number, role: string): QueryResult<VwAgents[]> => {
    try {
        let result = await db.selectFrom('Vw_Agents')
            .selectAll()
            .where('DivisionID', '=', divisionId.toString())
            // .where('AgentID', '<>', agentId)
            .where('IsActive', '=', 1)
            .orderBy('LastName', 'asc')
            
        if(role == 'SALES DIRECTOR'){
            result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        }

        if(role == 'UNIT MANAGER'){
            result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        }

        if(role == 'SALES PERSON'){
            result = result.where('Position', 'in', ['SALES PERSON'])
        }

        const queryResult = await result.execute();

        if(!queryResult){
            throw new Error('No agents found.')
        }

        return {
            success: true,
            data: queryResult
        }
    }

    catch (err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as VwAgents[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}