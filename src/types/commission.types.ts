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