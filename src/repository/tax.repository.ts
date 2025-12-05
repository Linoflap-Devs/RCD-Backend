import { db } from "../db/db";
import { QueryResult } from "../types/global.types";
import { ITblAgentTaxRates } from "../types/tax.types";

export const getAgentTaxRate = async (
    filters?: {
        agentTaxRateIds?: number[], 
        agentTaxRateCodes?: string[], 
        agentTaxRateNames?: string[]
    }
): QueryResult<ITblAgentTaxRates[]> => {
    try {
        let baseQuery = await db.selectFrom('Tbl_AgentTaxRates')
            .selectAll()
        
        if(filters && filters.agentTaxRateIds && filters.agentTaxRateIds.length > 0) {
            baseQuery = baseQuery.where('AgentTaxRateID', 'in', filters.agentTaxRateIds)
        }

        if(filters && filters.agentTaxRateCodes && filters.agentTaxRateCodes.length > 0) {
            baseQuery = baseQuery.where('AgentTaxRateCode', 'in', filters.agentTaxRateCodes)
        }

        if(filters && filters.agentTaxRateNames && filters.agentTaxRateNames.length > 0) {
            baseQuery = baseQuery.where('AgentTaxRateName', 'in', filters.agentTaxRateNames)
        }

        const result = await baseQuery.execute()

        return {
            success: true,
            data: result
        };
    }   

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as ITblAgentTaxRates[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const addAgentTaxRate = async (
    userId: number,
    data: ITblAgentTaxRates
): QueryResult<ITblAgentTaxRates> => {
    try {
        const result = await db.insertInto('Tbl_AgentTaxRates')
        .values({
            AgentTaxRateCode: data.AgentTaxRateCode,
            AgentTaxRateName: data.AgentTaxRateName,
            VATRate: data.VATRate,
            WtaxRAte: data.WtaxRAte,
            UpdateBy: userId,
            LastUpdate: new Date()
        })
        .outputAll('inserted')
        .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        };
    }

    catch(err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as ITblAgentTaxRates,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}