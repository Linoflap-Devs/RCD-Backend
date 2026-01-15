import { QueryResult } from "../types/global.types"
import { findAgentDetailsByAgentId, findAgentDetailsByUserId, findEmployeeUserById } from "../repository/users.repository"
import { activateDivision, addDivision, deleteDivision, editDivision, getDivisionAgents, getDivisions } from "../repository/division.repository"
import { getDivisionSalesTotalsFn } from "../repository/sales.repository"
import { IAddDivision, IDivision, ITblDivision } from "../types/division.types"
import { TblDivision } from "../db/db-types"

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
        position: item.Position?.trim() || ''
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