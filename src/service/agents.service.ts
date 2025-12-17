import { VwAgents } from "../db/db-types";
import { addAgent, deleteAgent, editAgent, getAgent, getAgentByCode, getAgentEducation, getAgentImages, getAgentRegistration, getAgentRegistrations, getAgents, getAgentUserByAgentId, getAgentWithRegistration, getAgentWithUser, getAgentWorkExp } from "../repository/agents.repository";
import { editDivisionBroker, getDivisionBrokers } from "../repository/division.repository";
import { getPositions } from "../repository/position.repository";
import { getAgentTaxRate } from "../repository/tax.repository";
import { findAgentDetailsByAgentId, findAgentDetailsByUserId } from "../repository/users.repository";
import { IAddAgent, ITblAgent, ITblAgentRegistration } from "../types/agent.types";
import { IAgentRegistration, IAgentRegistrationListItem } from "../types/auth.types";
import { IBrokerDivision } from "../types/division.types";
import { QueryResult } from "../types/global.types";
import { TblImageWithId } from "../types/image.types";
import { ITblAgentTaxRates } from "../types/tax.types";
import { IAgent } from "../types/users.types";

export const getAgentsService = async (filters?: {showInactive?: boolean, division?: number, position?: 'SP' | 'UM' | 'SD' | 'BR'}): QueryResult<IAgent[]> => {

    const positionMap = new Map<string, number[]>(
        [
            ['SP', [5]],
            ['UM', [86]],
            ['SD', [85]],
            ['BR', [72, 73, 76]]
        ]
    )

    const result = await getAgents({
        ...filters,
        positionId: filters && filters.position ? positionMap.get(filters.position) : undefined
    })

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

    console.log(agentWithUserResult, registrationResult, agentEducation, agentWork)

    let backupAgentData: VwAgents | undefined = undefined

    if(!agentWithUserResult.success){

        const agent = await getAgent(agentId)

        if(!agent.success){
            return {
                success: false,
                data: null,
                error: agent.error
            }
        }

        backupAgentData = agent.data
        // return {
        //     success: false,
        //     data: null,
        //     error: agentWithUserResult.error
        // }
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

    // divisions

    const brokerDivisions = await getDivisionBrokers({ agentIds: [agentId]})

    const brokerPosition = await getPositions({ positionName: 'BROKER' })

    let isBroker = false
    let allowedDivisions: { DivisionID: number, DivisionName: string}[] = []

    const brokerPositionId = brokerPosition.data[0].PositionID

    if(agentWithUserResult.success || backupAgentData){
        const posId = agentWithUserResult.data.agent.PositionID || backupAgentData?.PositionID  || 0
        if(posId === brokerPositionId){
            isBroker = true
            
            brokerDivisions.data.map((item: IBrokerDivision) => {
                allowedDivisions.push({
                    DivisionName: item.DivisionName,
                    DivisionID: item.DivisionID 
                })
            })        
        }
    }



    // tax rate
    let agentTaxRate: Partial<ITblAgentTaxRates> = {}
    if(agentWithUserResult.data || backupAgentData){

        const taxRate = await getAgentTaxRate({ agentTaxRateIds: [agentWithUserResult.data.agent.AgentTaxRate || backupAgentData?.AgentTaxRate || 0] })

        if(taxRate.success && taxRate.data.length > 0){
            const item = taxRate.data[0]
            agentTaxRate = {
                AgentTaxRateID: item.AgentTaxRateID,
                AgentTaxRateCode: item.AgentTaxRateCode,
                AgentTaxRateName: item.AgentTaxRateName,
                VATRate: item.VATRate,
                WtaxRAte: item.WtaxRAte
            }
        }
    }
    
    const obj = {
        agent: agentWithUserResult.success ? agentWithUserResult.data.agent : backupAgentData,
        registrationResult: {
            ...registrationResult.data,
            experience: agentWork.data,
            education: agentEducation.data,
        },
        taxRate: agentTaxRate,
        ...isBroker && { divisions: allowedDivisions },
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

    if(!data.PositionID){
        const position = await getPositions({positionName: 'SALES PERSON'})

        if(position.success){
            data.PositionID = position.data[0].PositionID
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

export const editAgentService = async (userId: number, agentId: number, data: Partial<IAddAgent>, divisions?: number[]) => {

    if(data.AgentCode){
        data.AgentCode = undefined
    }

    console.log('edit data', data)

    // verify position ID
    const agentData = await findAgentDetailsByAgentId(agentId)
    const positionName = agentData.data.Position?.split(' ').join('').toLowerCase()

    if(data.PositionID){
        
        if(!agentData.success){
            return {
                success: false,
                data: {},
                error: agentData.error
            }
        }
    
        if(!agentData.data.PositionID && !data.PositionID){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Position is required.'
                }
            }
        }

       

        if(positionName?.includes('broker')) {
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Broker agents cannot be promoted.'
                }
            }
        }

        if(positionName == 'salesperson'){
            const umPosition = await getPositions({positionName: 'UNIT MANAGER'})

            console.log(umPosition)

            if(umPosition.success){
                // check if position id is for unit manager
                if(data.PositionID != umPosition.data[0].PositionID){
                    return {
                        success: false,
                        data: {},
                        error: {
                            code: 400,
                            message: 'Position ID does not match for Unit Manager.'
                        }
                    }
                }
            } else {
                data.PositionID = undefined
            }

            
        }

        else if(positionName == 'unitmanager'){
            // check if position id is for sales director
            const sdPosition = await getPositions({positionName: 'SALES DIRECTOR'})

            console.log(sdPosition)

            if(sdPosition.success){
                if(data.PositionID != sdPosition.data[0].PositionID){
                    return {
                        success: false,
                        data: {},
                        error: {
                            code: 400,
                            message: 'Position ID does not match for Sales Director.'
                        }
                    }
                }
            }

            else {
                data.PositionID = undefined
            }
            
            
        }

        else {
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: "Agent's position cannot be edited."
                }
            }
        }

    }

    

    const result = await editAgent(userId, agentId, data, agentData.data)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    // edit divisions

    console.log(positionName)
    console.log(divisions)

    if(positionName && positionName.includes('broker')){
        if(divisions){
            const editDivisions = await editDivisionBroker(userId, divisions, {agentId: agentId})

            if(!editDivisions.success){
                return {
                    success: false,
                    data: {},
                    error: editDivisions.error
                }
            }
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