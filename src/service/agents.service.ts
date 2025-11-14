import { addAgent, deleteAgent, editAgent, getAgent, getAgentByCode, getAgentEducation, getAgentImages, getAgentRegistration, getAgentRegistrations, getAgents, getAgentUserByAgentId, getAgentWithRegistration, getAgentWithUser, getAgentWorkExp } from "../repository/agents.repository";
import { IAddAgent, ITblAgent, ITblAgentRegistration } from "../types/agent.types";
import { IAgentRegistration, IAgentRegistrationListItem } from "../types/auth.types";
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

export const getAgentRegistrationsService = async (): QueryResult<IAgentRegistrationListItem[]> => {
    const result = await getAgentRegistrations()

    if(!result.success){
        return {
            success: false,
            data: [] as IAgentRegistrationListItem[],
            error: result.error
        }
    }

    const obj: IAgentRegistrationListItem[] = result.data.map((item: IAgentRegistration) => ({
        AgentRegistrationID: item.AgentRegistrationID,
        FirstName: item.FirstName,
        MiddleName: item.MiddleName || '',
        LastName: item.LastName,
        Email: item.Email,
        Gender: item.Gender,
        ContactNumber: item.ContactNumber
    }))

    return {
        success: true,
        data: obj
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

export const lookupAgentRegistrationService = async (userId: number, agentRegistrationId: number): QueryResult<IAgentRegistration> => {

    if(!agentRegistrationId){
        return {
            success: false,
            data: {} as IAgentRegistration,
            error: {
                code: 400,
                message: 'Agent registration id is required.'
            }
        }
    }

    const result = await getAgentRegistrations({agentRegistrationId: agentRegistrationId})

    if(!result.success){
        return {
            success: false,
            data: {} as IAgentRegistration,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data[0]
    }
}

export const addAgentService = async (userId: number, data: IAddAgent) => {

    console.log()

    const existingAgent = await getAgentByCode(data.AgentCode)

    console.log(existingAgent)

    if(existingAgent.success){
        return {
            success: false,
            data: {},
            error: {
                code: 400,
                message: 'Agent code already exists.'
            }
        }
    }

    const result = await addAgent(userId, data)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editAgentService = async (userId: number, agentId: number, data: Partial<IAddAgent>) => {

    if(data.AgentCode){
        data.AgentCode = undefined
    }

    const result = await editAgent(userId, agentId, data)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }

}

export const deleteAgentService = async (userId: number, agentId: number): QueryResult<ITblAgent> => {
    const result = await deleteAgent(userId, agentId)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgent,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}