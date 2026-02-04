import { VwAgents } from "../db/db-types";
import { addAgent, deleteAgent, editAgent, getAgent, getAgentByCode, getAgentEducation, getAgentImages, getAgentRegistration, getAgentRegistrations, getAgents, getAgentUserByAgentId, getAgentWithRegistration, getAgentWithUser, getAgentWorkExp } from "../repository/agents.repository";
import { editDivisionBroker, getDivisionBrokers } from "../repository/division.repository";
import { getPositions } from "../repository/position.repository";
import { getMultipleTotalPersonalSales } from "../repository/sales.repository";
import { getAgentTaxRate } from "../repository/tax.repository";
import { findAgentDetailsByAgentId, findAgentDetailsByUserId, getAgentUsers } from "../repository/users.repository";
import { IAddAgent, ITblAgent, ITblAgentRegistration } from "../types/agent.types";
import { IAgentRegistration, IAgentRegistrationListItem, ITblAgentUser } from "../types/auth.types";
import { IBrokerDivision } from "../types/division.types";
import { QueryResult } from "../types/global.types";
import { TblImageWithId } from "../types/image.types";
import { ITblAgentTaxRates } from "../types/tax.types";
import { IAgent } from "../types/users.types";

export const getAgentsService = async (
    filters?: {
        showInactive?: boolean, 
        showNoDivision?: boolean,
        division?: number, 
        position?: 'SP' | 'UM' | 'SD' | 'BR',
        isRegistered?: boolean,
        isVerified?: boolean,
        month?: number,
        year?: number,
        searchTerm?: string
    }, 
    pagination?: {
        page?: number,
        pageSize?: number
    },
    showRegistration: boolean = false,
    showSales: boolean = false,
    showBrokerDivisions: boolean = false,
    showHandsOffBrokers: boolean = false
): QueryResult<{totalPages: number, results: IAgent[]}> => {

    const positionMap = new Map<string, number[]>(
        [
            ['SP', [5]],
            ['UM', [86]],
            ['SD', [85]],
            ['BR', [72, 73, 76]]
        ]
    )

    console.log('filters', filters)
    console.log('showBrokerDivisions', showBrokerDivisions)
    console.log('showSales', showSales)
    // const brokerPositionIds = [72, 73, 76]

    const result = await getAgents(
        {
            ...filters,
            positionId: filters && filters.position ? positionMap.get(filters.position) : undefined,
        },
        pagination
    )

    if(!result.success){
        return {
            success: false,
            data: {} as {totalPages: number, results: IAgent[]},
            error: result.error
        }
    }

    // Conditionally fetch sales data only if showSales is true
    let agentSalesMap = new Map<number, number>();
    let brokerDivisionMap = new Map<number, {DivisionID: number, DivisionName: string}[]>()

    if (showSales) {
        const agentSales = await getMultipleTotalPersonalSales(
            { agentIds: result.data.results.map((b: IAgent) => b.AgentID) },
            filters
        )

        // Create lookup maps for O(1) access
        if (agentSales.success) {
            agentSalesMap = new Map(
                agentSales.data.map((s: any) => [s.AgentID, s.TotalSales || 0])
            );
        }
    }

    if(showBrokerDivisions){
        
        const brokerPositions = positionMap.get('BR') || []
        
        const validBrokers = result.data.results.filter((a: IAgent) => brokerPositions.includes(a.PositionID || 0))

        const brokerDivisions = await getDivisionBrokers({ agentIds: validBrokers.map((agent: IAgent) => agent.AgentID)})

        if(brokerDivisions.success){
            brokerDivisions.data.forEach((d: IBrokerDivision) => {
                const divisionInfo = { DivisionID: d.DivisionID, DivisionName: d.DivisionName }

                if(d.AgentID){
                    const existing = brokerDivisionMap.get(d.AgentID) || []
                    brokerDivisionMap.set(d.AgentID, [...existing, divisionInfo])
                }
            })
        }
    }

    const obj = result.data.results.map((item: (IAgent & { IsVerified: number | null })) => {
        return {
            ...item,
            IsVerified: item.IsVerified == 1 ? true : false,
            ...(showSales && { TotalSales: agentSalesMap.get(item.AgentID) || 0 } ),
            ...((showBrokerDivisions && positionMap.get('BR')?.includes(item.PositionID || 0)) && { BrokerDivisions: brokerDivisionMap.get(item.AgentID) || [] })

        }
    })

    return {
        success: true,
        data: {
            totalPages: result.data.totalPages,
            results: obj
        }
    }
}

export const getAgentRegistrationsService = async (pagination?: {page?: number, pageSize?: number}): QueryResult<{totalPages: number, result: IAgentRegistrationListItem[]}> => {
    const result = await getAgentRegistrations({ isVerified: 1 }, pagination)

    if(!result.success){
        return {
            success: false,
            data: {} as {totalPages: number, result: IAgentRegistrationListItem[]},
            error: result.error
        }
    }

    const obj: IAgentRegistrationListItem[] = result.data.result.map((item: IAgentRegistration) => ({
        AgentRegistrationID: item.AgentRegistrationID,
        FirstName: item.FirstName,
        MiddleName: item.MiddleName || '',
        LastName: item.LastName,
        Email: item.Email,
        Gender: item.Gender,
        ContactNumber: item.ContactNumber,
        Division: item.Division
    }))

    return {
        success: true,
        data: {
            totalPages: result.data.totalPages,
            result: obj
        }
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
        data: result.data.result[0]
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

    if(data.ReferredByID){
        const referringAgent = await findAgentDetailsByAgentId(data.ReferredByID)

        if(!referringAgent.success){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Cannot find referring agent. \n' + referringAgent.error?.message
                }
            }
        }

        if(referringAgent.data.Position !== 'UNIT MANAGER'){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Referring agent is not a Unit Manager.'
                }
            }
        }

        data.ReferredCode = referringAgent.data.AgentCode
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