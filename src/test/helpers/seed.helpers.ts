
import { sql, Transaction } from "kysely";
import { db } from "../../db/db";
import { DB, TblDivision, TblPosition } from "../../db/db-types";
import { ITblDivision, ITblDivisionRequests } from "../../types/division.types";
import { QueryResult } from "../../types/global.types";

export const seedPositions = async (): QueryResult<TblPosition[]> => {

    try {
        const result = await db.insertInto('Tbl_Position')
                        .values([
                            { 
                                PositionID: 5,
                                Position: 'SALES PERSON',
                                PositionCode: 'S',
                                IsActive: 1,
                                LastUpdate: new Date(),
                                UpdateBy: 1
                            },
                            { 
                                PositionID: 76,
                                Position: 'BROKER',
                                PositionCode: 'BR',
                                IsActive: 1,
                                LastUpdate: new Date(),
                                UpdateBy: 1
                            },
                            { 
                                PositionID: 85,
                                Position: 'SALES DIRECTOR',
                                PositionCode: 'SD',
                                IsActive: 1,
                                LastUpdate: new Date(),
                                UpdateBy: 1
                            },
                            { 
                                PositionID: 86,
                                Position: 'UNIT MANAGER',
                                PositionCode: 'UM',
                                IsActive: 1,
                                LastUpdate: new Date(),
                                UpdateBy: 1
                            },
                        ])
                        .outputAll('inserted')
                        .execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as TblPosition[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const seedDivisions = async(): QueryResult<ITblDivision[]> => {
    const trx = await db.startTransaction().execute()

    try {

        const result = await trx.insertInto('Tbl_Division')
                        .values([
                            { 
                                DivisionID: 1,
                                Division: 'DIVISION A',
                                DivisionCode: 'DIV-A',
                                IsActive: 1,
                                LastUpdate: new Date(),
                                UpdateBy: 1,
                                DirectorID: 0
                            },
                            { 
                                DivisionID: 2,
                                Division: 'DIVISION B',
                                DivisionCode: 'DIV-B',
                                IsActive: 1,
                                LastUpdate: new Date(),
                                UpdateBy: 1,
                                DirectorID: 0
                            },
                        ])
                        .outputAll('inserted')
                        .execute()

        await trx.commit().execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        await trx.rollback().execute()
        const error = err as Error
        return {
            success: false,
            data: [] as ITblDivision[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const seedDivisionRequests = async(
    options: {
        divisionId: number, 
        unitManagerId: number, 
        agentId: number, 
        isApproved?: boolean, 
        amount: number,
        idOffset?: number
    } 
): QueryResult<ITblDivisionRequests[]> => {
    try {

        const loops = options.amount ? options.amount : 10;

        const result = await db.insertInto('Tbl_DivisionRequests')
                        .values(Array.from({ length: loops }, () => ({
                            DivisionID: options.divisionId,
                            UnitManagerID: options.unitManagerId,
                            AgentID: options.agentId,
                            IsActive: 1,
                            IsUMApproved: options.isApproved ? 1 : 0,
                            CreatedAt: new Date(),
                            UpdatedAt: null,
                            UpdatedBy: null,
                            Remarks: null
                        })))
                        .outputAll('inserted')
                        .execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblDivisionRequests[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}   