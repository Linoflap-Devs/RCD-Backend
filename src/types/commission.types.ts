import { AddPendingSaleDetail } from "./sales.types"

export interface FnCommissionForecast {
    ReservationDate: Date	
    BuyersName: string	
    SalesTranID: number	
    DeveloperID: number	
    NetTotalTCP: number	
    DownPayment: number	
    MonthlyDP: number	
    DPStartSchedule: Date	
    DPTerms: number	
    EndDP: Date	
    MonthPaid: number	
    DPPaid: number
    ForeCastPercentDPPaid: number
    PercentRelease: number	
    DPPercentPaid: number	
    DeveloperName: string
    Division: string	
    ProjectName: string
    rowno: number
}

export interface FnCommissionForecastTopBuyer {
    BuyersName: string	
    NetTotalTCP: number
}

export interface FnCommissionForecastByMonth {
    Month: number,	
    Year: number
    NetTotalTCP: number
}

export interface FnCommissionForecastYear {
    Year: number,
    Months: {
        Month: number,
        NetTotalTCP: number
    }[]
}

export interface FnCommissionForecastPercentage {
    TotalForecast: number,
    TotalPaid: number,
    TotalPaidPercent: number
}

export enum CommissionDetailPositions {
    BROKER = 'BROKER',
    SALES_DIRECTOR = 'SALES DIRECTOR',
    UNIT_MANAGER = 'UNIT MANAGER',
    SALES_PERSON = 'SALES PERSON',
    SALES_ASSOCIATE = 'SALES ASSOCIATE',
    ASSISTANCE_FEE = 'ASSISTANCE FEE',
    REFERRAL_FEE = 'REFERRAL FEE',
    OTHERS = 'OTHERS'
}

export interface CommissionRate {
    agentId?: number,
    agentName?: string,
    commissionRate: number,
}

export interface CommissionRateDetail {
    broker?: CommissionRate;
    salesDirector?: CommissionRate;
    unitManager?: CommissionRate;
    salesPerson?: CommissionRate;
    salesAssociate?: CommissionRate;
    assistanceFee?: CommissionRate;
    referralFee?: CommissionRate;
    others?: CommissionRate;
}