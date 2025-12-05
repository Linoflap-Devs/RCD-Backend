import { addAgentTaxRate, editAgentTaxRate, getAgentTaxRate } from "../repository/tax.repository"
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

export const addAgentTaxRateService = async (userId: number, data: Partial<ITblAgentTaxRates>): QueryResult<ITblAgentTaxRates> => {
    // check for duplicates
    if(data.AgentTaxRateCode){
        const codeCheck = await getAgentTaxRate({ agentTaxRateCodes: [data.AgentTaxRateCode] })

        if(codeCheck.success && codeCheck.data.length > 0){
            return {
                success: false,
                data: {} as ITblAgentTaxRates,
                error: {
                    code: 400,
                    message: 'Agent tax rate code already exists'
                }
            }
        }
    }

    if(data.AgentTaxRateName){
        const nameCheck = await getAgentTaxRate({ agentTaxRateNames: [data.AgentTaxRateName] })

        if(nameCheck.success && nameCheck.data.length > 0){
            return {
                success: false,
                data: {} as ITblAgentTaxRates,
                error: {
                    code: 400,
                    message: 'Agent tax rate name already exists'
                }
            }
        }
    }

    const result = await addAgentTaxRate(userId, data as ITblAgentTaxRates)

    if(!result.success) {
        return {
            success: false,
            data: {} as ITblAgentTaxRates,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const editAgentTaxRateService = async (userId: number, agentTaxRateId: number, data: Partial<ITblAgentTaxRates>): QueryResult<ITblAgentTaxRates> => {

    // check for duplicates
    if(data.AgentTaxRateCode){
        const codeCheck = await getAgentTaxRate({ agentTaxRateCodes: [data.AgentTaxRateCode] })

        if(codeCheck.success && codeCheck.data.length > 0){
            return {
                success: false,
                data: {} as ITblAgentTaxRates,
                error: {
                    code: 400,
                    message: 'Agent tax rate code already exists'
                }
            }
        }
    }

    if(data.AgentTaxRateName){
        const nameCheck = await getAgentTaxRate({ agentTaxRateNames: [data.AgentTaxRateName] })

        if(nameCheck.success && nameCheck.data.length > 0){
            return {
                success: false,
                data: {} as ITblAgentTaxRates,
                error: {
                    code: 400,
                    message: 'Agent tax rate name already exists'
                }
            }
        }
    }

    const result = await editAgentTaxRate(userId, agentTaxRateId, data)

    if(!result.success) {
        return {
            success: false,
            data: {} as ITblAgentTaxRates,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}