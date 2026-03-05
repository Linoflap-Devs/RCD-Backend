import { PaginationResult, QueryResult } from "../types/global.types"
import { db } from "../db/db"
import { TblDivision, TblDivisionRequests, VwAgents } from "../db/db-types"
import { IAddDivision, IDivision, ITblDivision, IBrokerDivision, ITblBrokerDivision, ITblDivisionRequests, IAddDivisionRequest } from "../types/division.types"
import { ITblAgent, ITblAgentNullableID } from "../types/agent.types"

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

export const getDivisionBrokers = async (filters?: {
    agentIds?: number[], 
    brokerIds?: number[], 
    excludeHandsOn?: boolean, 
    excludeHandsOff?: boolean,
    divisionIds?: number[] | null
}): QueryResult<IBrokerDivision[]> => {

    try {
        let baseQuery = await db.selectFrom('Tbl_BrokerDivision')
            .innerJoin('Tbl_Division', 'Tbl_Division.DivisionID', 'Tbl_BrokerDivision.DivisionID')
            .select('Tbl_Division.Division')
            .selectAll()
        
        const hasAgentFilter = filters?.agentIds && filters.agentIds.length > 0;
        const hasBrokerFilter = filters?.brokerIds && filters.brokerIds.length > 0;

        if ( filters && filters?.excludeHandsOn) {
            baseQuery = baseQuery.where('Tbl_BrokerDivision.BrokerID', '<>', null);
        }

        if( filters && filters?.excludeHandsOff) {
            baseQuery = baseQuery.where('Tbl_BrokerDivision.AgentID', '<>', null);
        }

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

        if (filters && filters?.divisionIds) {
            if(filters.divisionIds && filters.divisionIds.length > 0){
                baseQuery = baseQuery.where('Tbl_BrokerDivision.DivisionID', 'in', filters.divisionIds)
            }
            else {
                baseQuery = baseQuery.where('Tbl_BrokerDivision.DivisionID', '=', null)
            }
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

// Division Requests

export const getDivisionRequests = async (
    filters?: {
        divisionRequestIds?: number[],
        divisionId?: number,
        unitManagerId?: number,
        agentId?: number,
        showInactive?: boolean,
        showApproved?: boolean,
    },
    pagination?: {
        page?: number,
        pageSize?: number
    },
    options?: {
        take?: number,
    },
): QueryResult<PaginationResult<(ITblDivisionRequests & { Agent?: Partial<ITblAgentNullableID> })[]>> => {
    try {

        console.log(filters, pagination)

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let baseQuery = await db.selectFrom('Tbl_DivisionRequests')
            .leftJoin('Tbl_Agents', 'Tbl_DivisionRequests.AgentID', 'Tbl_Agents.AgentID')
            .selectAll('Tbl_DivisionRequests')
            .select([
                'Tbl_Agents.FirstName', 
                'Tbl_Agents.MiddleName', 
                'Tbl_Agents.LastName', 
                'Tbl_Agents.AgentCode', 
                'Tbl_Agents.Address', 
                'Tbl_Agents.Sex', 
                'Tbl_Agents.AffiliationDate'
            ])

        let countQuery = await db.selectFrom('Tbl_DivisionRequests')
            .select(({fn}) => fn.countAll<number>().as('count'))

        if(filters && filters.divisionId){
            baseQuery = baseQuery.where('Tbl_DivisionRequests.DivisionID', '=', filters.divisionId)
            countQuery = countQuery.where('Tbl_DivisionRequests.DivisionID', '=', filters.divisionId)
        }

        if(filters && filters.divisionRequestIds){
            baseQuery = baseQuery.where('Tbl_DivisionRequests.DivisionRequestID', 'in', filters.divisionRequestIds)
            countQuery = countQuery.where('Tbl_DivisionRequests.DivisionRequestID', 'in', filters.divisionRequestIds)
        }

        if(filters && filters.unitManagerId){
            baseQuery = baseQuery.where('UnitManagerID', '=', filters.unitManagerId)
            countQuery = countQuery.where('UnitManagerID', '=', filters.unitManagerId)
        }

        if(filters && filters.agentId){
            baseQuery = baseQuery.where('Tbl_DivisionRequests.AgentID', '=', filters.agentId)
            countQuery = countQuery.where('Tbl_DivisionRequests.AgentID', '=', filters.agentId)
        }

        if(!filters || !filters.showInactive){
            baseQuery = baseQuery.where('Tbl_DivisionRequests.IsActive', '=', 1)
            countQuery = countQuery.where('Tbl_DivisionRequests.IsActive', '=', 1)
        }

        if(!filters || !filters.showApproved){
            baseQuery = baseQuery.where('IsUMApproved', '=', 0)
            countQuery = countQuery.where('IsUMApproved', '=', 0)
        }

        if(options && options.take){
            baseQuery = baseQuery.top(options.take)
        }

        if(pagination && pagination.page && pagination.pageSize){
            baseQuery = baseQuery.offset(offset).fetch(pagination.pageSize)
        }

        baseQuery = baseQuery.orderBy('CreatedAt', 'desc')

        const result = await baseQuery.execute();
        const count = await countQuery.execute();

        const totalCountResult = count ? Number(count[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCountResult / pageSize) : 1;
        

        return {
            success: true,
            data: {
                totalResults: totalCountResult,
                totalPages: totalPages,
                page: page,
                results: result,
            }
        }

    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as PaginationResult<ITblDivisionRequests[]>,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const addDivisionRequest = async ( data: IAddDivisionRequest ): QueryResult<ITblDivisionRequests> => {
    try {
        const result = await db.insertInto('Tbl_DivisionRequests')
            .values({
                DivisionID: data.DivisionID,
                UnitManagerID: data.UnitManagerID,
                AgentID: data.AgentID,
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(error: unknown){
        const err = error as Error
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                code: 400,
                message: err.message
            }
        }
    }
}

export const editDivisionRequest = async (agentId: number, divisionRequestId: number, data: Partial<ITblDivisionRequests> ): QueryResult<ITblDivisionRequests> => {
    try {

        const updateData = {...data, UpdatedAt: new Date(), UpdatedBy: agentId}

        const result = await db.updateTable('Tbl_DivisionRequests')
            .set(updateData)
            .where('DivisionRequestID', '=', divisionRequestId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(error: unknown){
        const err = error as Error
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                code: 400,
                message: err.message
            }
        }
    }
}

export const approveDivisionRequestTransaction = async (unitManagerId: number, referredCode: string, divisionRequestId: number): QueryResult<ITblDivisionRequests> => {
    
    const trx = await db.startTransaction().execute();
    try {
        const approvedDivisionRequest = await trx.updateTable('Tbl_DivisionRequests')
            .set({IsUMApproved: 1, IsActive: 1, UpdatedAt: new Date(), UpdatedBy: unitManagerId})
            .where('DivisionRequestID', '=', divisionRequestId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        const editAgent = await trx.updateTable('Tbl_Agents')
            .set({
                ReferredByID: approvedDivisionRequest.UnitManagerID,
                ReferredCode: referredCode, 
                DivisionID: approvedDivisionRequest.DivisionID.toString(),
            })
            .outputAll('inserted')
            .where('AgentID', '=', approvedDivisionRequest.AgentID)
            .executeTakeFirstOrThrow()

        await trx.commit().execute()

        return {
            success: true,
            data: approvedDivisionRequest
        }
    }

    catch(err: unknown){
        await trx.rollback().execute()
        const error = err as Error
        return {
            success: false,
            data: {} as ITblDivisionRequests,
            error: {
                code: 400,
                message: error.message
            },
        }
    }   
}