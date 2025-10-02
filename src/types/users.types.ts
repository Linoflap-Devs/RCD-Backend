import { VwAgents } from "../db/db-types";

export interface IAgent {
    Address: string;
    AddressEmergency: string;
    AffiliationDate: Date;
    AgentCode: string;
    AgentID: number;
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
    IsActive: number;
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
    Sex: string;
    SSSNumber: string | null;
    TelephoneNumber: string | null;
    TINNumber: string | null;
    UpdateBy: number;
}

export type IAgentPicture = IAgent & {
    ContentType?: string;
    CreatedAt?: Date;
    FileContent?: Buffer;
    FileExtension?: string;
    Filename?: string;
    FileSize?: number;
    ImageID?: number;
}

export type VwAgentPicture = VwAgents & {
    Email?: string | null;
    Image?: {
        ContentType: string;
        CreatedAt: Date;
        FileContent: string;
        FileExtension: string;
        Filename: string;
        FileSize: number;
        ImageID: number;
    }
}

export type IAgentWorkExp = {
    AgentID?: number | null;
    AgentRegistrationID?: number | null;
    AgentWorkExpID: number;
    Company: string;
    EndDate: Date;
    JobTitle: string;
    StartDate: Date;
}

export type NewEducation = {
    Degree: string;
    EndDate: Date | null;
    School: string;
    StartDate: Date;
}

export type NewWorkExp = {
    Company: string;
    EndDate: Date;
    JobTitle: string;
    StartDate: Date;
}

export type IAgentEducation = {
    AgentEducationID: number;
    AgentID?: number | null;
    AgentRegistrationID?: number | null;
    Degree: string;
    EndDate: Date | null;
    School: string;
    StartDate: Date;
}

export type IAgentEducationEdit = {
    AgentEducationID: number;
    AgentRegistrationID?: number | null;
    Degree?: string;
    EndDate?: Date | null;
    School?: string;
    StartDate?: Date;
}

export type IAgentWorkExpEdit = {
    AgentWorkExpID: number;
    AgentRegistrationID?: number | null;
    Company?: string;
    EndDate?: Date;
    JobTitle?: string;
    StartDate?: Date;
}

export interface IAgentEdit {
    firstName?: string,
    middleName?: string,
    lastName?: string,
    gender?: 'Male' | 'Female',
    civilStatus?: 'Single' | 'Married',
    religion?: string,
    birthdate?: Date,
    birthplace?: string,
    address?: string,
    telephoneNumber?: string,
    contactNumber?: string,
}

export interface IAgentEducationEditController {
    agentEducationID: number;
    degree?: string;
    endDate?: Date;
    school?: string;
    startDate?: Date;
}

export interface IAgentWorkExpEditController {
    agentWorkExpID: number;
    company?: string;
    endDate?: Date;
    jobTitle?: string;
    startDate?: Date;
}