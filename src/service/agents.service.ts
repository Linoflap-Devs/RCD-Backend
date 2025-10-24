import { getAgentEducation, getAgentImages, getAgentRegistrations, getAgents, getAgentWithRegistration, getAgentWorkExp } from "../repository/agents.repository";
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

    const agentResult = await getAgentWithRegistration(agentId);

    if(!agentResult.success){
        return {
            success: false,
            data: null,
            error: agentResult.error
        }
    }

    const imageIds = []
    imageIds.push(agentResult.data.ImageID)
    imageIds.push(agentResult.data.SelfieImageID)
    imageIds.push(agentResult.data.GovImageID)

    // get education and work

    const agentEducation = await getAgentEducation(agentId)

    const agentWork = await getAgentWorkExp(agentId)

    // images

    const agentImages = await getAgentImages(imageIds.filter(id => id != null) as number[])
    const formattedImages = agentImages.data.map((img: TblImageWithId) => {
            return {
                ...img,
                FileContent: img.FileContent.toString('base64')
            }
    })

    console.log(agentResult.data)
    
    const obj = {
        ...agentResult.data,
        Education: agentEducation.data,
        Experience: agentWork.data,
        Images: formattedImages
    }

    return {
        success: true,
        data: obj
    }
}