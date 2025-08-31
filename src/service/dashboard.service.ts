import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";

export const getAgentDashboard = async (agentUserId: number): QueryResult<any> => {

    const result = await findAgentDetailsByUserId(agentUserId)

    if(!result.success){
        logger('Failed to find user.', {agentUserId: agentUserId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 500
            }
        }
    }

    const userInfo = {
        firstName: result.data.FirstName,
        lastName: result.data.LastName,
        middleName: result.data.MiddleName ?? '',
        division: result.data.Division,
        position: result.data.Position,
        profileImage: result.data.Image ? result.data.Image : null,
    }

    return {
        success: true,
        data: userInfo
    }
}