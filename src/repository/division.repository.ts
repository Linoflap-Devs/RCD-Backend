import { QueryResult } from "../types/global.types"
import { db } from "../db/db"
import { TblDivision, VwAgents } from "../db/db-types"
import { IAddDivision, IDivision, ITblDivision, IBrokerDivision, ITblBrokerDivision } from "../types/division.types"

// Divisions
export const getDivisions = async (filters?: {divisionIds?: number[]}): QueryResult<ITblDivision[]> => {
    try {
        let baseQuery = await db.selectFrom('Tbl_Division').selectAll()

        if(filters && filters.divisionIds && filters.divisionIds.length > 0){
            baseQuery = baseQuery.where('DivisionID', 'in', filters.divisionIds)
        }

        const result = await baseQuery.execute();

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

export const activateDivision = async (divisionId: number): QueryResult<ITblDivision> => {
    try {
        const result = await db.updateTable('Tbl_Division')
            .set({ IsActive: 1})
            .where('DivisionID', '=', divisionId)
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
            }
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
            
        // if(role == 'SALES DIRECTOR'){
        //     result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        // }

        // if(role == 'UNIT MANAGER'){
        //     result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        // }

        // if(role == 'SALES PERSON'){
        //     result = result.where('Position', 'in', ['SALES DIRECTOR', 'UNIT MANAGER', 'SALES PERSON'])
        // }

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

export const getDivisionBrokers = async (filters?: {agentIds?: number[], brokerIds?: number[]}): QueryResult<IBrokerDivision[]> => {

    try {
        let baseQuery = await db.selectFrom('Tbl_BrokerDivision')
            .innerJoin('Tbl_Division', 'Tbl_Division.DivisionID', 'Tbl_BrokerDivision.DivisionID')
            .select('Tbl_Division.Division')
            .selectAll()
        
        const hasAgentFilter = filters?.agentIds && filters.agentIds.length > 0;
        const hasBrokerFilter = filters?.brokerIds && filters.brokerIds.length > 0;

        if (hasAgentFilter && hasBrokerFilter) {
        // Use OR condition to match either AgentID or BrokerID
        baseQuery = baseQuery.where((eb) =>
            eb.or([
            eb('AgentID', 'in', filters.agentIds!),
            eb('BrokerID', 'in', filters.brokerIds!)
            ])
        );
        } else if (hasAgentFilter) {
            baseQuery = baseQuery.where('AgentID', 'in', filters.agentIds!);
        } else if (hasBrokerFilter) {
            baseQuery = baseQuery.where('BrokerID', 'in', filters.brokerIds!);
        }

        const result = await baseQuery.execute()

        const obj: IBrokerDivision[] = result.map((item: any) => {
            return {
                DivisionName: item.Division,
                AgentID: item.AgentID,
                BrokerID: item.BrokerID,
                DivisionID: item.DivisionID
            }
        })

        return {
            success: true,
            data: obj
        };
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as IBrokerDivision[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editDivisionBroker = async (userId: number,  divisionIds: number[], broker: {agentId?: number, brokerId?: number}): QueryResult<ITblBrokerDivision[]> => {
    const trx = await db.startTransaction().execute();
    try {
         // Delete existing divisions for the specific broker or agent
        let deleteQuery = trx.deleteFrom('Tbl_BrokerDivision');
        
        if (broker.agentId !== undefined) {
            deleteQuery = deleteQuery.where('AgentID', '=', broker.agentId);
        } else if (broker.brokerId !== undefined) {
            deleteQuery = deleteQuery.where('BrokerID', '=', broker.brokerId);
        } else {
            // If neither is provided, rollback and return error
            await trx.rollback().execute();
            return {
                success: false,
                data: [] as ITblBrokerDivision[],
                error: {
                    code: 400,
                    message: 'Either agentId or brokerId must be provided'
                }
            };
        }
        
        await deleteQuery.execute();

        let inserted: ITblBrokerDivision[] = [] 

        if(divisionIds.length > 0){
            const insertNew = await trx.insertInto('Tbl_BrokerDivision')
                .values(divisionIds.map((divisionId) => ({
                    AgentID: broker.agentId || null,
                    BrokerID: broker.brokerId || null,
                    DivisionID: divisionId,
                    UpdatedBy: userId
                })))
                .outputAll('inserted')
                .execute()

            inserted = insertNew
        }

        await trx.commit().execute()

        return {
            success: true,
            data: inserted
        }

    }

    catch(err: unknown) {
        trx.rollback().execute()
        const error = err as Error
        return {
            success: false,
            data: [] as ITblBrokerDivision[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }   
}