import { getAgentRegistrations, getAgents } from "../repository/agents.repository";
import { IAgentRegistration } from "../types/auth.types";
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

export const getAgentRegistrationsService = async (): QueryResult<IAgentRegistration[]> => {
    const result = await getAgentRegistrations()

    if(!result.success){
        return {
            success: false,
            data: [] as IAgentRegistration[],
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}