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