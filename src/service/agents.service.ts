import { getAgent, getAgentEducation, getAgentImages, getAgentRegistration, getAgentRegistrations, getAgents, getAgentUserByAgentId, getAgentWithRegistration, getAgentWithUser, getAgentWorkExp } from "../repository/agents.repository";
import { ITblAgentRegistration } from "../types/agent.types";
import { IAgentRegistration } from "../types/auth.types";
import { QueryResult } from "../types/global.types";
import { TblImageWithId } from "../types/image.types";
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

export const lookupAgentDetailsService = async (agentId: number): QueryResult<any> => {

    const [
        agentWithUserResult,
        registrationResult,
        agentEducation,
        agentWork
    ] = await Promise.all([
        getAgentWithUser(agentId),
        getAgentRegistration({agentId: agentId}),
        getAgentEducation(agentId),
        getAgentWorkExp(agentId)
    ])


    if(!agentWithUserResult.success){
        return {
            success: false,
            data: null,
            error: agentWithUserResult.error
        }
    }

    const imageIds = []
    imageIds.push(agentWithUserResult.data.user.ImageID || null)
    imageIds.push(registrationResult.data.SelfieImageID || null)
    imageIds.push(registrationResult.data.GovImageID || null)

    // images

    const agentImages = await getAgentImages(imageIds.filter(id => id != null) as number[])
    const formattedImages = agentImages.data.map((img: TblImageWithId) => {
            return {
                ...img,
                FileContent: img.FileContent.toString('base64')
            }
    })
    
    const obj = {
        agent: agentWithUserResult.data.agent,
        registrationResult: {
            ...registrationResult.data,
            experience: agentWork.data,
            education: agentEducation.data,
        },
        images: formattedImages
    }

    return {
        success: true,
        data: obj
    }
}

export const lookupAgentRegistrationService = async (userId: number, agentRegistrationId: number): QueryResult<ITblAgentRegistration> => {

    const result = await getAgentRegistration({agentRegistrationId: agentRegistrationId})

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}