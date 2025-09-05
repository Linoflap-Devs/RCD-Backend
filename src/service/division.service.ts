import { QueryResult } from "../types/global.types"
import { findAgentDetailsByUserId } from "../repository/users.repository"
import { getDivisionAgents } from "../repository/division.repository"

export const getDivisionHierarchyService = async (agentUserId: number): QueryResult<any> => {
    const result = await findAgentDetailsByUserId(agentUserId)
    if(!result.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    if(!result.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!result.data.DivisionID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No division found',
                code: 400
            }
        }
    }

    if(!result.data.Position){
        return {
            success: false,
            data: {},
            error: {
                message: 'No position found',
                code: 400
            }
        }
    }

    const divisionAgents = await getDivisionAgents(result.data.AgentID, Number(result.data.DivisionID), result.data.Position)

    if(!divisionAgents.success){
        return {
            success: false,
            data: {},
            error: divisionAgents.error
        }
    }

    const agentMap = divisionAgents.data.map(item => ({
        agentId: item.AgentID,
        firstName: item.FirstName?.trim() || '',
        lastName: item.LastName?.trim() || '',
        middleName: item.MiddleName?.trim() || '',
        position: item.Position?.trim() || ''
    }))

    return {
        success: true,
        data: agentMap
    }
}