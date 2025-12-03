export interface IDivision {
    DivisionID: number,
    DivisionName: string,
    DivisionCode: string
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

export interface IBrokerDivision {
  AgentID?: number,
  BrokerID?: number,
  DivisionID: number,
  DivisionName: string
}