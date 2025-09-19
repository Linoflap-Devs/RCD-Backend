export interface AgentPendingSalesDetail {
    AgentID: number;
    AgentName: string | null;
    AgentPendingSalesDtlID: number;
    Commission: number;
    CommissionRate: number;
    PendingSalesTranCode: string;
    PositionID: number;
    PositionName: string;
    VATRate: number;
    WTaxRate: number;
}

export interface AgentPendingSale {
    AgentPendingSalesID: number;
    ApprovalStatus: number;
    ApprovedSalesTranID: number | null;
    Block: string;
    BuyersAddress: string | null;
    BuyersContactNumber: string | null;
    BuyersName: string | null;
    BuyersOccupation: string | null;
    CommStatus: string | null;
    CreatedBy: number;
    DateFiled: Date | null;
    DevCommType: string;
    DeveloperID: number | null;
    DivisionID: number | null;
    DownPayment: number;
    DPStartSchedule: Date | null;
    DPTerms: string;
    FinancingScheme: string;
    FloorArea: number;
    LastUpdate: Date;
    LastUpdateby: number;
    Lot: string;
    LotArea: number;
    MiscFee: number;
    MonthlyDP: number;
    NetTotalTCP: number;
    PendingSalesTranCode: string;
    Phase: string;
    ProjectID: number | null;
    ProjectLocationID: number | null;
    Remarks: string | null;
    ReservationDate: Date;
    SalesBranchID: number | null;
    SalesSectorID: number;
    SalesStatus: string;
    SellerName: string;
}

export interface AgentPendingSalesWithDetails {
    AgentPendingSalesID: number;
    ApprovalStatus: number;
    ApprovedSalesTranID: number | null;
    Block: string;
    BuyersAddress: string | null;
    BuyersContactNumber: string | null;
    BuyersName: string | null;
    BuyersOccupation: string | null;
    CommStatus: string | null;
    CreatedBy: number;
    DateFiled: Date | null;
    DevCommType: string;
    DeveloperID: number | null;
    DivisionID: number | null;
    DownPayment: number;
    DPStartSchedule: Date | null;
    DPTerms: string;
    FinancingScheme: string;
    FloorArea: number;
    LastUpdate: Date;
    LastUpdateby: number;
    Lot: string;
    LotArea: number;
    MiscFee: number;
    MonthlyDP: number;
    NetTotalTCP: number;
    PendingSalesTranCode: string;
    Phase: string;
    ProjectID: number | null;
    ProjectLocationID: number | null;
    Remarks: string | null;
    ReservationDate: Date;
    SalesBranchID: number | null;
    SalesSectorID: number;
    SalesStatus: string;
    SellerName: string;
    DivisionName: string | null;
    ProjectName: string | null;
    SalesBranchName: string | null;
    DeveloperName: string | null;
    SalesSectorName: string | null;
    Details: {
        AgentID: number;
        AgentName: string | null;
        AgentPendingSalesDtlID: number;
        Commission: number;
        CommissionRate: number;
        PendingSalesTranCode: string;
        PositionID: number;
        PositionName: string;
        VATRate: number;
        WTaxRate: number;
    }[]
}

export interface EditPendingSaleDetail {
    pendingSalesDtlId: number,
    agentId?: number,
    agentName?: string,
    commissionRate: number,
}