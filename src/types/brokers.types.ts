import { ITypedImageBase64 } from "./image.types";

export interface IBroker {
    Address: string | null;
      AddressEmergency: string | null;
      Affiliation: Date | null;
      Birthdate: Date | null;
      Birthplace: string | null;
      Broker: string;
      BrokerCode: string;
      BrokerID: number;
      CivilStatus: string | null;
      ContactEmergency: string | null;
      ContactNumber: string | null;
      DSHUDNumber: string | null;
      EmployeeIDNumber: string | null;
      GovImageID: number | null;
      IsActive: number;
      LastUpdate: Date;
      PagIbigNumber: string | null;
      PersonEmergency: string | null;
      PhilhealthNumber: string | null;
      PositionID: number | null;
      PRCNumber: string | null;
      ReferredByID: number | null;
      Religion: string | null;
      RepresentativeName: string;
      SelfieImageID: number | null;
      SSSNumber: string | null;
      TelephoneNumber: string | null;
      TINNumber: string | null;
      UpdateBy: number;
}

export type IBrokerPicture = IBroker & {
    ContentType?: string;
    CreatedAt?: Date;
    FileContent?: Buffer;
    FileExtension?: string;
    Filename?: string;
    FileSize?: number;
    ImageID?: number;
}

export type IBrokerEmailPicture = IBroker & {
    BrokerRegistrationID: number | null;
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


export interface ITblBroker {
    Address: string | null;
    AddressEmergency: string | null;
    Affiliation: Date | null;
    Birthdate: Date | null;
    Birthplace: string | null;
    Broker: string;
    BrokerCode: string;
    BrokerID: number;
    BrokerTaxRate: number,
    CivilStatus: string | null;
    ContactEmergency: string | null;
    ContactNumber: string | null;
    DSHUDNumber: string | null;
    EmployeeIDNumber: string | null;
    GovImageID: number | null;
    IsActive: number;
    LastUpdate: Date;
    PagIbigNumber: string | null;
    PersonEmergency: string | null;
    PhilhealthNumber: string | null;
    PositionID: number | null;
    PRCNumber: string | null;
    ReferredByID: number | null;
    Religion: string | null;
    RepresentativeName: string;
    SelfieImageID: number | null;
    Sex: string | null;
    SSSNumber: string | null;
    TelephoneNumber: string | null;
    TINNumber: string | null;
    UpdateBy: number;
    BrokerRegistrationID?: number | null,
    Email?: string | null,
}

export interface ITblBrokerRegistration {
    Address: string;
    AddressEmergency: string;
    AffiliationDate: Date;
    Birthdate: Date;
    Birthplace: string | null;
    BrokerCode: string;
    BrokerRegistrationID: number;
    BrokerTaxRate: number;
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

export interface IBrokerRegistration {
    BrokerRegistrationID: number,
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

export interface IEditBroker {
    name: string, 
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
}

export interface ITblBrokerWorkExp {
    BrokerID?: number | null;
    BrokerRegistrationID?: number | null;
    BrokerWorkExpID: number;
    Company: string;
    EndDate: Date | null;
    JobTitle: string;
    StartDate: Date;
}

export interface ITblBrokerEducation {
  BrokerEducationID: number;
  BrokerID?: number | null;
  BrokerRegistrationID?: number | null;
  Degree: string;
  EndDate: Date | null;
  School: string;
  StartDate: Date;
}

export interface IBrokerRegistrationListItem {
    AgentRegistrationID?: number | null,
    BrokerRegistrationID?: number | null,
    RepresentativeName: string,
    Email: string,
    Gender: string,
    ContactNumber: string,
}

export interface IAddBroker {
    BrokerType: 'hands-on' | 'hands-off';
    Address: string;
    AddressEmergency: string;
    AffiliationDate: Date;
    BrokerCode: string;
    BrokerTaxRate: number;
    Birthdate: Date;
    Birthplace: string | null;
    CivilStatus: string;
    ContactEmergency: string;
    ContactNumber: string;
    DivisionID: string | null;
    DSHUDNumber: string | null;
    EmployeeIDNumber: string | null;
    FirstName: string;
    LastName: string;
    MiddleName: string;
    PagIbigNumber: string | null;
    PersonEmergency: string;
    PhilhealthNumber: string | null;
    PositionID?: number | null;
    PRCNumber: string | null;
    ReferredByID: number | null;
    ReferredCode: string | null;
    Religion: string | null;
    Sex: string;
    SSSNumber: string | null;
    TelephoneNumber: string | null;
    TINNumber: string | null;
}