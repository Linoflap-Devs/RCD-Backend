import { sql } from "kysely";
import { db } from "../../db/db";
import { TblAgentPendingSales, TblAgentPendingSalesDtl, TblAgentUser } from "../../db/db-types";
import { ITblAgentUser, ITblBrokerUser, ITblUsersWeb } from "../../types/auth.types";
import { QueryResult } from "../../types/global.types";
import { hashPassword } from "../../utils/scrypt";
import 'dotenv/config'
import { ITblBroker } from "../../types/brokers.types";
import { AgentPendingSale, ITblAgentPendingSales, ITblSalesTrans } from "../../types/sales.types";

export const createPendingSale = async (data: Partial<AgentPendingSale>): QueryResult<ITblAgentPendingSales> => {
    try {
        const sale = await db.insertInto('Tbl_AgentPendingSales')
            .values({
                PendingSalesTranCode: 'PST' + Date.now(),
                DivisionID: data.DivisionID || 1,
                DateFiled: new Date(),
                ReservationDate: data.ReservationDate || new Date(),
                BuyersName: data.BuyersName || 'Test Buyer',
                BuyersAddress: data.BuyersAddress || '123 Test St',
                BuyersOccupation: data.BuyersOccupation || 'Tester',
                BuyersContactNumber: data.BuyersContactNumber || '1234567890',
                ProjectLocationID: null,
                ProjectID: data.ProjectID || 1,
                DeveloperID: data.DeveloperID || 1,
                FinancingScheme: data.FinancingScheme || 'PAG-IBIG',
                Block: "1",
                Lot: "1",
                Phase: "1",
                LotArea: 0,
                FloorArea: 0,
                NetTotalTCP: data.NetTotalTCP || 1000000,
                MiscFee: data.MiscFee || 0,
                DownPayment: data.DownPayment || 100000,
                MonthlyDP: data.MonthlyDP || 10000,
                DPStartSchedule: data.DPStartSchedule || new Date(),
                DevCommType: "3",
                DPTerms: data.DPTerms || "12",
                SalesSectorID: data.SalesSectorID || 1,
                SalesStatus: data.SalesStatus || "PENDING APPROVAL - UNIT MANAGER",
                ApprovalStatus: data.ApprovalStatus || 0,
                LastUpdate: new Date(),
                SellerName: data.SellerName || 'Test Seller',
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        const saleDtl = await db.insertInto('Tbl_AgentPendingSalesDtl')
            .values([
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 76,
                    PositionName: 'BROKER',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                },
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 85,
                    PositionName: 'SALES DIRECTOR',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                },
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 86,
                    PositionName: 'UNIT MANAGER',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                },
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 0,
                    PositionName: 'SALES ASSOCIATE',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                },
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 0,
                    PositionName: 'ASSISTANCE FEE',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                },
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 0,
                    PositionName: 'REFERRAL FEE',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                },
                {
                    PendingSalesTranCode: sale.PendingSalesTranCode,
                    AgentID: 0,
                    CommissionRate: 0,
                    PositionID: 0,
                    PositionName: 'FEE',
                    AgentName: '',
                    Commission: 0,
                    VATRate: 0,
                    WTaxRate: 0,
                }
            ])
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: sale
        }
    }   

    catch(err: unknown){
        console.error('Error creating pending sale:', err)

        return {
            success: false,
            data: {} as ITblAgentPendingSales,
            error: {
                code: 500,
                message: 'Error creating pending sale'
            }
        }
    }
}
