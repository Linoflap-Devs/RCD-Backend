import { VwSalesTransactions } from "../db/db-types";
import { getCommissionForecastByMonthFn, getCommissionForecastFn, getCommissionForecastTopBuyersFn, getCommissions, getTotalAgentCommissions } from "../repository/commission.repository";
import { getDivisionSales, getDivisionSalesTotalsFn, getPersonalSales, getSalesByDeveloperTotals, getSalesTarget, getTotalPersonalSales } from "../repository/sales.repository";
import { getWebKPIs } from "../repository/dashboard.repository";
import { findAgentDetailsByUserId } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { logger } from "../utils/logger";
import { FnDivisionSales } from "../types/sales.types";
import { getSalesPersonSalesTotalsFn, getUnitManagerSalesTotalsFn } from "../repository/agents.repository";
import { FnAgentSales } from "../types/agent.types";
import { FnCommissionForecastByMonth, FnCommissionForecastYear } from "../types/commission.types";

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

export const getWebDashboardService = async (): QueryResult<any> => {

    // KPI
    // Active salesforce
    // total active divisions
    // total active agents
    // total previous year sales
    const kpi = await getWebKPIs()

    const kpiInfo = {
        totalDivisions: kpi.data.TotalDivisions || 0,
        totalAgents: kpi.data.TotalActiveAgents || 0,
        totalProjects: kpi.data.TotalProjects || 0,
        totalSalesPreviousYear: kpi.data.TotalSalesPreviousYear || 0,
        totalSalesCurrentMonth: kpi.data.TotalSalesCurrentMonth || 0,
        totalSalesLastMonth: kpi.data.TotalSalesLastMonth || 0
    }

    // Sales Target
    const salesTarget = await getSalesTarget(
        [
            {field: "DivisionName", direction: "asc"}
        ]
    )


    // Division Sales

    const divSales = await getDivisionSalesTotalsFn(
        [
            { field: 'Division', direction: 'asc' }
        ],
    )

    // top 10 divs

    const top10Divs = await getDivisionSalesTotalsFn(
        [
            { field: 'CurrentMonth', direction: 'desc' },
            { field: 'Division', direction: 'asc' }
        ],
        10
    )
    const top10DivsFormat = top10Divs.data.map((division: FnDivisionSales) => ({Division: division.Division, CurrentMonth: division.CurrentMonth}))

    // top 10 unit managers
    const top10Ums = await getUnitManagerSalesTotalsFn(
        [ 
            { field: 'CurrentMonth', direction: 'desc' },
            { field: 'AgentName', direction: 'asc' }
        ],
        10
    )
    const top10UmsFormat = top10Ums.data.map((um: FnAgentSales) => ({AgentName: um.AgentName, CurrentMonth: um.CurrentMonth}))

    // top 10 sales person
    const top10Sps = await getSalesPersonSalesTotalsFn(
        [
            { field: 'CurrentMonth', direction: 'desc' },
            { field: 'AgentName', direction: 'asc' }
        ],
        10 
    )
    const top10SpsFormat = top10Sps.data.map((sp: FnAgentSales) => ({AgentName: sp.AgentName, CurrentMonth: sp.CurrentMonth}))

    // developer sales

    const developerSales = await getSalesByDeveloperTotals(
        [
            { field: 'NetTotalTCP', direction: 'desc' }
        ],
        undefined,
        new Date()
    )

    // top 10 buyers forecast
    const top10ForecastBuyers = await getCommissionForecastTopBuyersFn(
        [
            { field: 'NetTotalTCP', direction: 'desc' }
        ],
        10
    )

    // commission forecast per month
    const commForecastByMonth = await getCommissionForecastByMonthFn(
        [   
            { field: 'Year', direction: 'desc' },
            { field: 'Month', direction: 'desc' }
        ]
    )

    // format into year objects
    const yearMap = new Map<number, {Month: number, NetTotalTCP: number}[]>()

    commForecastByMonth.data.forEach(curr => {
        if (!yearMap.has(curr.Year)) {
            yearMap.set(curr.Year, [])
        }
        yearMap.get(curr.Year)!.push({
            Month: curr.Month,
            NetTotalTCP: curr.NetTotalTCP
        })
    })

    const commForecastByMonthFormat: FnCommissionForecastYear[] = Array.from(yearMap.entries())
        .map(([year, months]) => ({
            Year: year,
            Months: months.sort((a, b) => a.Month - b.Month)
        }))
        .sort((a, b) => b.Year - a.Year)

    // commission forecast
    const commForecast = await getCommissionForecastFn()
    
    return {
        success: true,
        data: {
            KPI: kpiInfo,
            SalesTarget: salesTarget.data,
            DivisionSales: divSales.data,
            Top10Divisions: top10DivsFormat,
            Top10UnitManagers: top10UmsFormat,
            Top10SalesPersons: top10SpsFormat,
            DeveloperSales: developerSales.data,
            Top10ForecastBuyers: top10ForecastBuyers.data,
            CommissionForecastByYearMonth: commForecastByMonthFormat,
            CommissionForecast: commForecast.data
        }
    }
}