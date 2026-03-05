export interface IDivision {
    DivisionID: number,
    DivisionName: string,
    DivisionCode: string
    IsActive: number
}

export interface ITblDivision {
    DirectorID: number;
    Division: string;
    DivisionCode: string;
    DivisionID: number;
    IsActive: number;
    LastUpdate: Date;
    UpdateBy: number;
}

export interface IAddDivision {
    DivisionCode: string,
    Division: string,
    DirectorId?: number
}

export interface ITblBrokerDivision {
  AgentID: number | null;
  BrokerDivisionID: number;
  BrokerID: number | null;
  DivisionID: number;
  LastUpdated: Date;
  UpdatedBy: number;
}

export interface IBrokerDivision {
  AgentID?: number,
  BrokerID?: number,
  DivisionID: number,
  DivisionName: string
}

export interface ITblDivisionRequests {
  AgentID: number;
  CreatedAt: Date;
  DivisionID: number;
  DivisionRequestID: number;
  IsActive: number;
  IsUMApproved: number;
  Remarks: string | null;
  UnitManagerID: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

export interface IAddDivisionRequest {
  AgentID: number;
  DivisionID: number;
  UnitManagerID: number
}