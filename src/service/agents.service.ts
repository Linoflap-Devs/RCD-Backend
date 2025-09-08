import { getAgents } from "../repository/agents.repository";
import { QueryResult } from "../types/global.types";
import { IAgent } from "../types/users.types";

export const getAgentsService = async (filters?: {}): QueryResult<IAgent[]> => {
    const result = await getAgents(filters)

    if(!result.success){
        return {
            success: false,
            data: [] as IAgent[],
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}