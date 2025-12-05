import { getAgentTaxRate } from "../repository/tax.repository"
import { QueryResult } from "../types/global.types"
import { ITblAgentTaxRates } from "../types/tax.types"

export const getAgentTaxRatesService = async (
    filters?: { 
        agentTaxRateIds?: number[], 
        agentTaxRateCodes?: string[],
        agentTaxRateNames?: string[] 
    }
): QueryResult<Partial<ITblAgentTaxRates>[]> => {
    
    const result = await getAgentTaxRate(filters)

    if(!result.success){
        return {
            success: false,
            data: [] as ITblAgentTaxRates[],
            error: result.error
        }
    }

    const obj: Partial<ITblAgentTaxRates>[] = result.data.map((item: ITblAgentTaxRates) => ({
        AgentTaxRateID: item.AgentTaxRateID,
        AgentTaxRateCode: item.AgentTaxRateCode,
        AgentTaxRateName: item.AgentTaxRateName,
        VATRate: item.VATRate,
        WtaxRAte: item.WtaxRAte
    }))

    return {
        success: true,
        data: obj
    }

}