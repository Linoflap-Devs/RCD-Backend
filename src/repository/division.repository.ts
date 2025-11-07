import { QueryResult } from "../types/global.types"
import { db } from "../db/db"
import { TblDivision, VwAgents } from "../db/db-types"
import { IAddDivision, IDivision, ITblDivision } from "../types/division.types"

// Divisions
export const getDivisions = async (): QueryResult<ITblDivision[]> => {
    try {
        const result = await db.selectFrom('Tbl_Division').selectAll().execute();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblDivision[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const addDivision = async (userId: number, data: IAddDivision): QueryResult<ITblDivision> => {
    try {

        const result = await db.insertInto('Tbl_Division')
            .values({
                Division: data.Division,
                DivisionCode: data.DivisionCode,
                DirectorID: data.DirectorId || 0,
                LastUpdate: new Date(),
                UpdateBy: userId,
                IsActive: 1
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblDivision,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editDivision = async (userId: number, divisionId: number, data: Partial<IAddDivision>): QueryResult<ITblDivision> => {
    try {
        const updateData: Partial<ITblDivision> = {
            ...data,
            LastUpdate: new Date(),
            UpdateBy: userId
        }

        const result = await db.updateTable('Tbl_Division')
            .where('DivisionID', '=', divisionId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblDivision,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const deleteDivision = async (divisionId: number): QueryResult<ITblDivision> => {
    try {
        const result = await db.updateTable('Tbl_Division')
            .where('DivisionID', '=', divisionId)
            .set({ IsActive: 0})
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }

    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblDivision,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getDivisionAgents = async (agentId: number, divisionId: number, role: string): QueryResult<VwAgents[]> => {
    try {
        let result = await db.selectFrom('Vw_Agents')
            .selectAll()
            .where('DivisionID', '=', divisionId.toString())
            // .where('AgentID', '<>', agentId)
            .where('IsActive', '=', 1)
            .orderBy('LastName', 'asc')
            
        if(role == 'SALES DIRECTOR'){
            result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        }

        if(role == 'UNIT MANAGER'){
            result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        }

        if(role == 'SALES PERSON'){
            result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        }

        const queryResult = await result.execute();

        if(!queryResult){
            throw new Error('No agents found.')
        }

        return {
            success: true,
            data: queryResult
        }
    }

    catch (err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as VwAgents[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}