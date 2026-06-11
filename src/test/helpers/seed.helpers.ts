
import { Insertable, sql, Transaction } from "kysely";
import { db } from "../../db/db";
import { DB, TblDevelopers, TblDistribution, TblDivision, TblPosition, TblProjects, TblProjectType, TblSalesSector } from "../../db/db-types";
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

        const divisions: Insertable<TblDivision>[] = [
            { 
                Division: 'DIVISION A',
                DivisionCode: 'DIV-A',
                IsActive: 1,
                LastUpdate: new Date(),
                UpdateBy: 1,
                DirectorID: 0
            },
            { 
                Division: 'DIVISION B',
                DivisionCode: 'DIV-B',
                IsActive: 1,
                LastUpdate: new Date(),
                UpdateBy: 1,
                DirectorID: 0
            },
        ]

        const result = await trx.insertInto('Tbl_Division')
                        .values(divisions)
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

export const seedDistributionList = async () => {
    const obj: Insertable<TblDistribution>[] = [
        {
            DistributionCode: "BR",
            Distribution: "BROKER",
            PositionID: 76,
            Level: 0,
        },
        {
            DistributionCode: "SD",
            Distribution: "SALES DIRECTOR",
            PositionID: 85,
            Level: 1,
        },
        {
            DistributionCode: "UM",
            Distribution: "UNIT MANAGER",
            PositionID: 86,
            Level: 2,
        },
        {
            DistributionCode: "SP",
            Distribution: "SALES PERSON",
            PositionID: 0,
            Level: 0,
        },
        {
            DistributionCode: "BR",
            Distribution: "BROKER",
            PositionID: 5,
            Level: 0,
        },
    ]
    try {
        const result = await db.insertInto('Tbl_Distribution')
            .values(obj)
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
            data: [] as TblDistribution[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }

}

export const seedProjectsDevProjType = async () => {
    try {

        const idInsertDevelopers = await sql`SET IDENTITY_INSERT Tbl_Developers ON`.execute(db);

        const projTypeObj: Insertable<TblProjectType> = {
            ProjectTypeID: 1,
            ProjectTypeCode: 'HL',
            ProjectTypeName: 'HOUSE AND LOT',
            IsActive: 1,
            LastUpdate: new Date(),
            UpdateBy: 1
        }

        const projectType = await db.insertInto('Tbl_ProjectType') 
            .values([projTypeObj])
            .outputAll('inserted')
            .execute()

        const devObj: Insertable<TblDevelopers> = {
            DeveloperCode: 'DEV-1',
            DeveloperName: 'Developer 1',
            ContactPerson: 'John Doe',
            ContactNumber: '1234567890',
            Position: 'Developer',
            Address: '123 Main St',
            PartialReleaseType: 0,
            PartialReleaseAmount: 0,
            CommRate: 0,
            WtaxRate: 0,
            VATRate: 0,
            ReleaseSchedule: "DP PERCENT ERLEASE",
            TaxIDNumber: '1234567890',
            LastUpdate: new Date(),
            UpdateBy: 1
        }

        const developer = await db.insertInto('Tbl_Developers')
            .values([devObj])
            .outputAll('inserted')
            .execute()

             const sectorObj: Insertable<TblSalesSector> = {
            SectorID: 1,
            SectorCode: 'SECTOR-1',
            SectorName: 'Sector 1',
            LastUpdate: new Date(),
            UpdateBy: 1
        }
        const sector = await db.insertInto('Tbl_SalesSector')
            .values([sectorObj])    
            .outputAll('inserted')
            .execute()


        const projectObj: Insertable<TblProjects> = {
            ProjectCode: 'PRJ-1',
            ProjectName: 'Project 1',
            ProjectTypeID: 1,
            SectorID: 1,
            Address: '123 Main St',
            ContactNumber: '1234567890',
            DeveloperID: 1,
            IsLeadProject: 0,
            LastUpdate: new Date(),
            UpdateBy: 1
        }   

        const project = await db.insertInto('Tbl_Projects')
            .values([projectObj])
            .outputAll('inserted')
            .execute()

       
        return {
            success: true,
            data: {
                projectType: projectType,
                developer: developer,
                project: project,
                sector: sector
            }
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {},
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}