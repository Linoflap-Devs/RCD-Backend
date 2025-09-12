import { VwCommissionReleaseDeductionReport } from "../db/db-types";
import { getAgentCommissionDetails, getCommissions, getTotalAgentCommissions } from "../repository/commission.repository";
import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";

export const getAgentCommissionsService = async (userId: number, filters?: { month?: number }, pagination?: {page?: number, pageSize?: number}): QueryResult<any> => {
    const user = await findAgentDetailsByUserId(userId)

    if(!user.success){
        return {
            success: false,
            data: [] as any[],
            error: {
                message: 'No user found',
                code: 404
            }
        }
    }

    if(!user.data.AgentID){
        return {
            success: false,
            data: [] as any[],
            error: {
                message: 'No agent found',
                code: 404
            }
        }
    }

    console.log(user.data)

    const commissions = await getCommissions({ agentId: user.data.AgentID ?? undefined, month: filters?.month ?? undefined })

    if(!commissions.success){
        return {
            success: false,
            data: [] as any[],
            error: commissions.error
        }
    }

    const totalCommission = await getTotalAgentCommissions(user.data.AgentID, { month: filters?.month ?? undefined })

    if(!totalCommission.success){
        return {
            success: false,
            data: [] as any[],
            error: totalCommission.error
        }
    }

    const totalCommisionMap = commissions.data.results.map((commission: VwCommissionReleaseDeductionReport) => ({
        ReleaseDate: commission.CommReleaseDate,
        AgentId: commission.AgentID,
        CommReleaseId: commission.ComReleaseID,
    }))

    const obj = {
        totalPages: commissions.data.totalPages,
        totalCommission: totalCommission.data,
        commissions: totalCommisionMap
    }

    return {
        success: true,
        data: obj
    }
}

export const getAgentCommissionDetailsService = async (userId: number, date?: Date): QueryResult<any[]> => {
    const agent = await findAgentDetailsByUserId(userId)

    if(!agent.data.AgentID){
        return {
            success: false,
            data: [] as any[],
            error: {
                message: 'No agent found',
                code: 404
            }
        }
    }

    const commissionDetails = await getAgentCommissionDetails(agent.data.AgentID, date)

    if(!commissionDetails.success){
        return {
            success: false,
            data: [] as any[],
            error: commissionDetails.error
        }
    }

    const obj = commissionDetails.data.map((item: VwCommissionReleaseDeductionReport) => ({
        releaseDate: item.CommReleaseDate,
        grossCommission: item.GrossCommission,
        deductions: {
            cashAdvance: item.CA,
            cpd: item.CPD,
            rcdf: item.RCDF,
            loan: item.Loan,
            netCommission: item.NetCommision,
        },
        buyer: {
            srDate: '',
            buyer: item.BuyersName,
            property: item.Property,
            dasAmount: item.NetTotalTCP,
            developerCommRate: item.DeveloperTaxRate,
            commissionRelease: item.ReleasedAmount,
            commissionRate: item.CommissionRate,
        }
    }))

    return {
        success: true,
        data: obj
    }
}
