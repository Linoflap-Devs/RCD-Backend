
import { db } from "../../db/db";
import { TblDivision, TblPosition } from "../../db/db-types";
import { ITblDivision } from "../../types/division.types";
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
    try {
        const result = await db.insertInto('Tbl_Division')
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
                code: 500,
                message: error.message
            }
        }
    }
}