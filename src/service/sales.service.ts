import { VwSalesTransactions } from "../db/db-types";
import { getDivisionSales } from "../repository/sales.repository";
import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";

export const getUserDivisionSalesService = async (userId: number, pagination?: {page?: number, pageSize?: number}): QueryResult<any> => {

    const agent = await findAgentDetailsByUserId(userId)

    if(!agent.data.AgentID){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No agent found.'
            }
        }
    }

    const result = await getDivisionSales(userId, {agentId: agent.data.AgentID}, pagination);

    if(!result.success){
        return {
            success: false,
            data: [] as VwSalesTransactions[],
            error: {
                code: 500,
                message: 'No sales found.'
            }
        }
    }


    const sales = result.data.map((sale: VwSalesTransactions) => {
        return {
            projectName: sale.ProjectName,
            projectCode: sale.SalesTranCode,
            agentName: sale.AgentName,
            reservationDate: sale.ReservationDate
        }
    })

    return {
        success: true,
        data: sales
    }
}