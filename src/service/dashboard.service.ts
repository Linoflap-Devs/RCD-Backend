import { VwSalesTransactions } from "../db/db-types";
import { getCommissions, getTotalAgentCommissions } from "../repository/commission.repository";
import { getDivisionSales, getPersonalSales, getTotalPersonalSales } from "../repository/sales.repository";
import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";

export const getAgentDashboard = async (agentUserId: number, filters?: { month?: number, year?: number }): QueryResult<any> => {

    // user info

    const result = await findAgentDetailsByUserId(agentUserId)

    if(!result.success){
        logger('Failed to find user.', {agentUserId: agentUserId})
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 500
            }
        }
    }

    if(!result.data.AgentID){
        return {
            success: false,
            data: {} as any,
            error: {
                message: 'Failed to find user.',
                code: 500
            }
        }
    }

    const userInfo = {
        firstName: result.data.FirstName?.trim() || '',
        lastName: result.data.LastName?.trim() || '',
        middleName: result.data.MiddleName?.trim() ?? '',
        division: result.data.Division?.trim() || '',
        position: result.data.Position?.trim() || '',
        profileImage: result.data.Image ? result.data.Image : null,
    }

    // personal sales

    const personalSales = await getTotalPersonalSales(result.data.AgentID, filters)
    console.log(personalSales)

    let divisionSales = null
    let divisionSalesData: any[] = []
    if(result.data.DivisionID){
        const getDivSales = await getDivisionSales(Number(result.data.DivisionID), {amount: 3, isUnique: true, month: filters?.month, year: filters?.year})

        if(!getDivSales.success){
            logger('Failed to find division.', {agentUserId: agentUserId})
            return {
                success: false,
                data: {} as any,
                error: {
                    message: 'Failed to find division.',
                    code: 500
                }
            }
        }

        divisionSales = getDivSales.data
    }

    if(divisionSales){
        divisionSales.results.map((sale: VwSalesTransactions) => {
            divisionSalesData.push({
                salesId: sale.SalesTranID,
                salesCode: sale.SalesTranCode?.trim() || '',
                projectName: sale.ProjectName?.trim() || '',
                developerName: sale.DeveloperName?.trim() || '',
                price: sale.NetTotalTCP, 
                flrArea: sale.FloorArea,
                lotArea: sale.LotArea,
                dateFiled: sale.DateFiled
            })
        })
    }

    const salesInfo = {
        totalSales: personalSales.data
    }

    // commission

    const commissions = await getTotalAgentCommissions(result.data.AgentID, {month: filters?.month, year: filters?.year})

    const commissionInfo = {
        totalCommissions: commissions.data || 0
    }

    return {
        success: true,
        data: {
            user: userInfo,
            sales: salesInfo,
            commission: commissionInfo,
            divisionSales: divisionSalesData
        }
    }
}