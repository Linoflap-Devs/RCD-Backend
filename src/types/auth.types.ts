import { IImage, IImageBase64, ITypedImageBase64 } from "./image.types"

export interface IAgentSession {
    AgentUserID: number
    ExpiresAt: Date
    SessionID: number
    SessionString: string
}

export interface IAgentUser {
    AgentID: number | null
    AgentRegistrationID: number | null
    AgentUserID: number
    Email: string
    ImageID: number | null,
    IsVerified: number,
    Position: string
}

export interface ITblAgentUser {
    AgentID: number | null
    AgentRegistrationID: number | null
    AgentUserID: number
    Email: string
    ImageID: number | null,
    IsVerified: number,
}

export interface IAgentUserSession {
    AgentSession: IAgentSession
    AgentUser: IAgentUser
}

// Broker

export interface IBrokerSession {
    BrokerUserID: number
    ExpiresAt: Date
    SessionID: number
    SessionString: string
}

export interface IBrokerUser {
    BrokerID: number | null
    BrokerRegistrationID: number | null
    BrokerUserID: number
    Email: string
    ImageID: number | null,
    IsVerified: number,
}

export interface ITblBrokerUser {
    BrokerID: number | null
    BrokerRegistrationID: number | null
    BrokerUserID: number
    Email: string
    ImageID: number | null,
    IsVerified: number,
}

export interface IBrokerUserSession {
    BrokerSession: IBrokerSession
    BrokerUser: IBrokerUser
}

export interface IEmployeeSession {
    UserID: number
    ExpiresAt: Date
    SessionID: number
    SessionString: string
}

export interface IEmployeeUser {
    UserID: number | null
    UserName: string,
    EmpName: string,
    Role: string,
    BranchName: string
}

export interface IEmployeeUserSession {
    EmployeeSession: IEmployeeSession
    EmployeeUser: IEmployeeUser
}

export interface IAgentRegister {
    firstName: string,
    middleName?: string | null,
    lastName: string,
    gender: 'Male' | 'Female',
    civilStatus: 'Single' | 'Married',
    religion: string,
    birthdate: Date,
    birthplace: string,
    address: string,
    telephoneNumber: string,
    contactNumber: string,
    sssNumber?: string | null,
    philhealthNumber?: string | null,
    pagibigNumber?: string | null,
    tinNumber?: string | null,
    prcNumber?: string | null,
    dshudNumber?: string | null,
    employeeIdNumber?: string | null,
    email: string,
    password: string,

    profileImage?: Express.Multer.File,

    education: {
        school: string,
        degree: string,
        startDate: Date,
        endDate?: Date | null
    }[],
    experience: {
        jobTitle: string,
        company: string,
        startDate: Date,
        endDate?: Date | null
    }[]
}

export interface IAgentRegistrationListItem {
    AgentRegistrationID: number,
    FirstName: string,
    MiddleName?: string | null,
    LastName: string,
    Email: string,
    Gender: string,
    ContactNumber: string,
}

export interface IAgentRegistration {
    AgentRegistrationID: number,
    IsVerified: number,
    FirstName: string,
    MiddleName?: string | null,
    LastName: string,
    Gender: 'Male' | 'Female',
    CivilStatus: 'Single' | 'Married',
    Religion: string,
    Birthdate: Date,
    Birthplace: string,
    Address: string,
    TelephoneNumber: string,
    ContactNumber: string,
    SssNumber?: string | null,
    PhilhealthNumber?: string | null,
    PagibigNumber?: string | null,
    TinNumber?: string | null,
    PrcNumber?: string | null,
    DshudNumber?: string | null,
    EmployeeIdNumber?: string | null,
    Email: string,

    Images?: ITypedImageBase64[] | null

    Education: {
        School: string,
        Degree: string,
        StartDate: Date,
        EndDate?: Date | null
    }[],
    Experience: {
        JobTitle: string,
        Company: string,
        StartDate: Date,
        EndDate?: Date | null
    }[]
}

export interface Token {
    CreatedAt: Date;
    Token: string;
    TokenID: number;
    UserID: number;
    ValidUntil: Date;
}

export interface IEmployeeRegister {
    UserCode: string,
    UserName: string,
    EmpName: string,
    Password: string,
    Role: string,
    BranchName?: string,
    BranchID: number,
}

export interface ITblUsersWeb {
    BranchID: number;
    BranchName: string;
    EmpName: string;
    Password: string;
    Role: string;
    UserCode: string;
    UserName: string;
    UserWebID: number;
}