import { PaginationResult, QueryResult } from "../types/global.types"
import { findAgentDetailsByAgentId, findAgentDetailsByUserId, findEmployeeUserById } from "../repository/users.repository"
import { activateDivision, addDivision, addDivisionRequest, approveDivisionRequestTransaction, deleteDivision, editDivision, editDivisionRequest, getDivisionAgents, getDivisionRequests, getDivisions } from "../repository/division.repository"
import { getDivisionSalesTotalsFn } from "../repository/sales.repository"
import { IAddDivision, IDivision, ITblDivision, ITblDivisionRequests } from "../types/division.types"
import { TblDivision } from "../db/db-types"
import { agent } from "supertest"
import { IAgent } from "../types/users.types"
import { ITblAgentNullableID } from "../types/agent.types"

export const getDivisionsService = async (): QueryResult<IDivision[]> => {
    const result = await getDivisions()

    if(!result.success){
        return {
            success: false,
            data: [],
            error: result.error
        }
    }

    const obj = result.data.map((div: ITblDivision) => ({
        DivisionID: div.DivisionID,
        DivisionName: div.Division,
        DivisionCode: div.DivisionCode,
        DirectorID: div.DirectorID,
        IsActive: div.IsActive
    }))

    return {
        success: true,
        data: obj
    }
}   

export const addDivisionService = async ( userId: number, data: IAddDivision ): QueryResult<ITblDivision> => {
    const userData = await findEmployeeUserById(userId)

    if(!userData.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: userData.error
        }
    }

    if(data.DirectorId){
        const directorData = await findAgentDetailsByAgentId(data.DirectorId)

        if(!directorData.success){
            return {
                success: false,
                data: {} as ITblDivision,
                error: directorData.error
            }
        }
    }

    const existingDivision = await getDivisions()

    if(!existingDivision.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: existingDivision.error
        }
    }
    const activeDivisions = existingDivision.data.filter((div: ITblDivision) => div.IsActive == 1)
    const duplicates = activeDivisions.filter((div: ITblDivision) => div.DivisionCode.toLowerCase() === data.DivisionCode.toLowerCase() || div.Division.toLowerCase() === data.Division.toLowerCase())

    if(duplicates.length > 0){
        return {
            success: false,
            data: {} as ITblDivision,
            error: {
                code: 400,
                message: 'Division name or division code already exists.'
            }
        }
    }

    const result = await addDivision(userId, data)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editDivisionService = async ( userId: number, divisionId: number, data: Partial<IAddDivision> ): QueryResult<ITblDivision> => {

    const userData = await findEmployeeUserById(userId)

    if(!userData.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: userData.error
        }
    }

    const existingDivisions = await getDivisions()

    const activeDivisions = existingDivisions.data.filter((div: ITblDivision) => div.IsActive == 1)

    if(data && data.Division){
        const division = data.Division.toLowerCase()
        const duplicates = activeDivisions.filter((div: ITblDivision) => div.Division.toLowerCase() === division)

        if(duplicates.length > 0){
            return {
                success: false,
                data: {} as ITblDivision,
                error: {
                    code: 400,
                    message: 'Division name already exists.'
                }
            }
        }
    }

    if(data && data.DivisionCode){
        const divisionCode = data.DivisionCode.toLowerCase()
        const duplicates = activeDivisions.filter((div: ITblDivision) => div.DivisionCode.toLowerCase() === divisionCode)

        if(duplicates.length > 0){
            return {
                success: false,
                data: {} as ITblDivision,
                error: {
                    code: 400,
                    message: 'Division code already exists.'
                }
            }
        }
    }

    const result = await editDivision(userId, divisionId, data)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const deleteDivisionService = async ( userId: number, divisionId: number ): QueryResult<ITblDivision> => {

    const userData = await findEmployeeUserById(userId)

    if(!userData.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: userData.error
        }
    }

    const result = await deleteDivision(divisionId)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const activateDivisionService = async ( userId: number, divisionId: number ): QueryResult<ITblDivision> => {
    const userData = await findEmployeeUserById(userId)

    if(!userData.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: userData.error
        }
    }

    const divisionCheck = await getDivisions({ divisionIds: [divisionId] })

    if(!divisionCheck.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: divisionCheck.error
        }
    }

    if(divisionCheck.data.length == 0){
        return {
            success: false,
            data: {} as ITblDivision,
            error: {
                code: 400,
                message: 'Division not found.'
            }
        }
    }

    if(divisionCheck.data[0].IsActive == 1){
        return {
            success: false,
            data: {} as ITblDivision,
            error: {
                code: 400,
                message: 'Division is already active.'
            }
        }
    }

    const result = await activateDivision(divisionId)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDivision,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }

}

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
        position: item.Position?.trim() || '',
        positionId: item.PositionID,
        referredById: item.ReferredByID || null,
    }))

    return {
        success: true,
        data: agentMap
    }
}

export const getTop10DivisionService = async (date?: Date): QueryResult<any> => {
    const result = await getDivisionSalesTotalsFn(
        [
            { field: 'CurrentMonth', direction: 'desc' },
            { field: 'Division', direction: 'asc' }
        ], 
        10, 
        date ? new Date(date) : undefined
    )

    if(!result.success){
        return {
            success: false,
            data: [],
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const getDivisionRequestsService = async (
    userId: number, 
    filters?: {
        divisionRequestIds?: number[],
        divisionId?: number,
        unitManagerId?: number,
        agentId?: number,
        showInactive?: boolean,
        showApproved?: boolean
    },
    pagination?: {
        page?: number,
        pageSize?: number
    }
): QueryResult<PaginationResult<any>> => {

    const agentData = await findAgentDetailsByUserId(userId)

    if(!agentData.success){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: agentData.error
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!agentData.data.DivisionID){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: {
                message: 'No division found',
                code: 400
            }
        }
    }

    const result = await getDivisionRequests(
        {
            ...filters,
            divisionId: Number(agentData.data.DivisionID),
            unitManagerId: agentData.data.Position == 'UNIT MANAGER' ? agentData.data.AgentID : undefined
        },
        pagination
    )

    if(!result.success){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: result.error
        }
    }

    const obj: Partial<ITblDivisionRequests & { FirstName: string, LastName: string, MiddleName?: string | null }>[] = result.data.results.map(
        (item: ITblDivisionRequests & Partial<{ FirstName: string, LastName: string, MiddleName?: string | null }>) => ({
        DivisionRequestID: item.DivisionRequestID,
        AgentID: item.AgentID,
        DivisionID: item.DivisionID,
        UnitManagerID: item.UnitManagerID,
        CreatedAt: item.CreatedAt,
        IsActive: item.IsActive,
        IsUMApproved: item.IsUMApproved,
        Remarks: item.Remarks,
        FirstName: item.FirstName,
        LastName: item.LastName,
        MiddleName: item.MiddleName
    }))

    return {
        success: true,
        data: {
            ...result.data,
            results: obj
        }
    }
}

export const getDivisionRequestDetailsService = async (
    userId: number, 
    divisionRequestId: number
): QueryResult<any> => {

    const agentData = await findAgentDetailsByUserId(userId)

    if(!agentData.success){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: agentData.error
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!agentData.data.DivisionID){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: {
                message: 'No division found',
                code: 400
            }
        }
    }

    const result = await getDivisionRequests(
        {
            divisionRequestIds: [divisionRequestId],
            divisionId: Number(agentData.data.DivisionID),
            unitManagerId: agentData.data.Position == 'UNIT MANAGER' ? agentData.data.AgentID : undefined
        }
    )

    if(!result.success){
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: result.error
        }
    }
    
    console.log(result.data.results)

    // const obj: any = result.data.results.map((
    //     item: ITblDivisionRequests & { 
    //         FirstName: string, 
    //         LastName: string, 
    //         MiddleName?: string | null, 
    //         Sex?: string | null, 
    //         Address?: string | null, 
    //         AffiliationDate?: Date | null }
    // ) => ({
    //     DivisionRequestID: item.DivisionRequestID,
    //     AgentID: item.AgentID,
    //     DivisionID: item.DivisionID,
    //     UnitManagerID: item.UnitManagerID,
    //     CreatedAt: item.CreatedAt,
    //     IsActive: item.IsActive,
    //     IsUMApproved: item.IsUMApproved,
    //     Remarks: item.Remarks,
    //     Agent: {
    //         AgentID: item.AgentID,
    //         FirstName: item.FirstName,
    //         LastName: item.LastName,
    //         MiddleName: item?.Agent?.MiddleName,
    //         Sex: item?.Agent?.Sex,
    //         Address: item?.Agent?.Address,
    //         AffiliationDate: item?.Agent?.AffiliationDate,
    //     }
    // }))

    return {
        success: true,
        data: result.data.results[0] ? result.data.results[0] : {}
    }
}

export const getDivisionAgentLastRequestService = async (
    userId: number
): QueryResult<ITblDivisionRequests> => {

    const agentData = await findAgentDetailsByUserId(userId)

    if(!agentData.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: agentData.error
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    const result = await getDivisionRequests({ agentId: agentData.data.AgentID, showInactive: true, showApproved: true }, { page: 1, pageSize: 1 })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data.results[0] ? result.data.results[0] : {} as ITblDivisionRequests
    }
}

export const addDivisionRequestService = async ( userId: number, divisionId: number, unitManagerId: number ): QueryResult<ITblDivisionRequests> => {

    const agentData = await findAgentDetailsByUserId(userId)

    if(!agentData.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: agentData.error
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(agentData.data.ReferredByID || agentData.data.DivisionID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'User already has a division or a unit manager',
                code: 400
            }
        }
    }

    const existingRequest = await getDivisionRequests({
        agentId: agentData.data.AgentID
    })

    if(existingRequest.success && existingRequest.data.results.length > 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'User already has a pending division request',
                code: 400
            }
        }
    }

    const umData = await findAgentDetailsByAgentId(unitManagerId)

    if(!umData.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: umData.error
        }
    }

    if(!umData.data.AgentID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No unit manager found',
                code: 400
            }
        }
    }

    if(!umData.data.DivisionID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Unit Manager does not belong to a division',
                code: 400
            }
        }
    }

    if(Number(umData.data.DivisionID) != divisionId){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Unit manager does not belong to the given division',
                code: 400
            }
        }
    }

    const result = await addDivisionRequest({
        AgentID: agentData.data.AgentID,
        DivisionID: divisionId,
        UnitManagerID: umData.data.AgentID
    })

    if(!result.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const approveDivisionRequestService = async (userId: number, divisionRequestId: number): QueryResult<ITblDivisionRequests> => {

    const umData = await findAgentDetailsByUserId(userId)

    if(!umData.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: umData.error
        }
    }

    if(!umData.data.AgentID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!umData.data.AgentCode){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!umData.data.DivisionID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'User does not belong to a division',
                code: 400
            }
        }
    }

    const request = await getDivisionRequests({divisionRequestIds: [divisionRequestId]})

    if(!request.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: request.error
        }
    }

    if(request.data.results.length == 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No division request found',
                code: 400
            }
        }
    }

    const divisionRequest = request.data.results[0]

    if(divisionRequest.IsActive == 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Division request is no longer active',
                code: 400
            }
        }
    }

    if(divisionRequest.IsUMApproved != 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Division request has already been processed',
                code: 400
            }
        }
    }

    const agentData = await findAgentDetailsByAgentId(divisionRequest.AgentID)

    if(!agentData.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: agentData.error
        }
    }

    if(!agentData.data.AgentID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(agentData.data.ReferredByID || agentData.data.DivisionID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Agent already belongs to a division or UM.',
                code: 400
            }
        }
    }

    const result = await approveDivisionRequestTransaction(umData.data.AgentID, umData.data.AgentCode, divisionRequestId)
    
    if(!result.success) return {
        success: false,
        data: {} as ITblDivisionRequests,
        error: result.error
    }

    return {
        success: true,
        data: result.data
    }
}

export const rejectDivisionRequestService = async (userId: number, divisionRequestId: number, remarks?: string): QueryResult<ITblDivisionRequests> => {
     const umData = await findAgentDetailsByUserId(userId)

    if(!umData.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: umData.error
        }
    }

    if(!umData.data.AgentID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!umData.data.AgentCode){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!umData.data.DivisionID){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'User does not belong to a division',
                code: 400
            }
        }
    }

    const request = await getDivisionRequests({divisionRequestIds: [divisionRequestId]})

    if(!request.success){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: request.error
        }
    }

    if(request.data.results.length == 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'No division request found',
                code: 400
            }
        }
    }

    const divisionRequest = request.data.results[0]

    if(divisionRequest.IsActive == 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Division request is no longer active',
                code: 400
            }
        }
    }

    if(divisionRequest.IsUMApproved != 0){
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                message: 'Division request has already been processed',
                code: 400
            }
        }
    }

    const result = await editDivisionRequest(umData.data.AgentID, divisionRequest.DivisionRequestID, { IsUMApproved: -1, Remarks: remarks || undefined, IsActive: 0 })

    if(!result.success) return {
        success: false,
        data: {} as ITblDivisionRequests,
        error: result.error
    }

    return {
        success: true,
        data: result.data
    }
}