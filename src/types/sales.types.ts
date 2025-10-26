import { CommissionDetailPositions } from "./commission.types";

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

export interface IAgentPendingSale {
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
    LastUpdateByWeb: number | null;
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

export interface AgentPendingSale {
    AgentID: number | null;
    AgentName: string | null;
    AgentPendingSalesDtlID: number | null;
    AgentPendingSalesID: number;
    ApprovalStatus: number;
    ApprovedSalesTranID: number | null;
    Block: string;
    BuyersAddress: string | null;
    BuyersContactNumber: string | null;
    BuyersName: string | null;
    BuyersOccupation: string | null;
    CommissionRate: number | null;
    CreatedBy: number;
    CreatedByName: string | null;
    DateFiled: Date | null;
    DevCommType: string;
    DeveloperID: number | null;
    DeveloperName: string | null;
    Division: string | null;
    DivisionID: number | null;
    DownPayment: number;
    DPStartSchedule: Date | null;
    DPTerms: string;
    Expr1: number | null;
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
    PositionName: string | null;
    ProjectID: number | null;
    ProjectLocationID: number | null;
    ProjectName: string | null;
    ProjectTypeName: string | null;
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
    ProjectTypeName: string | null;
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

export interface AddPendingSaleDetail {
    position: CommissionDetailPositions
    agentId?: number,
    agentName?: string,
    commissionRate: number,
}


export interface FnDivisionSales {
    Division: string,	
    CurrentMonth: number,	
    LastMonth: number,	
    CurrentMonthLastYear: number,	
    CurrentQuarter: number,	
    LastQuarter: number,	
    LastYear: number,	
    CurrentYear: number
}

export interface FnSalesTarget {
    DivisionName: string	
    TargetMonth: number	
    CurrentMonth: number	
    PercentMonth: number	
    TargetYear: number	
    CurrentYear: number	
    PercentYear: number	
    SalesYear: number
}

export interface DeveloperSales {
    DeveloperName: string | null,
    NetTotalTCP: number | null
}

export interface SalesTargetTotals {
    TotalTargetMonth: number
    TotalCurrentMonth: number
    TotalReachPercent: number
}

export enum SaleStatus {
    REJECTED = 0,
    NEWLY_SUBMITTED = 1,
    UNIT_MANAGER_APPROVED = 2,
    SALES_DIRECTOR_APPROVED = 3,
    BRANCH_HEAD_APPROVED = 4,
    SALES_ADMIN_APPROVED = 5
}

export enum ApproverRole {
    UNIT_MANAGER = 1,
    SALES_DIRECTOR = 2,
    BRANCH_HEAD = 3,
    SALES_ADMIN = 4
}

export enum SalesStatusText {
    REJECTED = 'REJECTED',
    NEW = 'NEW',
    PENDING_UM = 'PENDING APPROVAL - UNIT MANAGER',
    PENDING_SD = 'PENDING APPROVAL - SALES DIRECTOR',
    PENDING_BH = 'PENDING APPROVAL - BRANCH HEAD',
    PENDING_SA = 'PENDING APPROVAL - SALES ADMIN',
    APPROVED = 'APPROVED'
}