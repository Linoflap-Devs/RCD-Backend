export interface FnAgentSales {
    AgentName: string,	
    CurrentMonth: number,	
    LastMonth: number,	
    CurrentMonthLastYear: number,	
    CurrentQuarter: number,	
    LastQuarter: number,	
    LastYear: number,	
    CurrentYear: number
}

export interface IAgentRegistration {
    Address: string;
    AddressEmergency: string;
    AffiliationDate: Date;
    AgentCode: string;
    AgentRegistrationID: number;
    AgentTaxRate: number;
    Birthdate: Date;
    Birthplace: string | null;
    CivilStatus: string;
    ContactEmergency: string;
    ContactNumber: string;
    DivisionID: string | null;
    DSHUDNumber: string | null;
    EmployeeIDNumber: string | null;
    FirstName: string;
    GovImageID: number | null;
    IsVerified: number;
    LastName: string;
    LastUpdate: Date;
    MiddleName: string;
    PagIbigNumber: string | null;
    PersonEmergency: string;
    PhilhealthNumber: string | null;
    PositionID: number | null;
    PRCNumber: string | null;
    ReferredByID: number | null;
    ReferredCode: string | null;
    Religion: string | null;
    SelfieImageID: number | null;
    Sex: string;
    SSSNumber: string | null;
    TelephoneNumber: string | null;
    TINNumber: string | null;
    UpdateBy: number | null;
}