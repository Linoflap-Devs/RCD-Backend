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

export interface ITblBrokerWorkExp {
    BrokerID: number | null;
    BrokerRegistrationID: number | null;
    BrokerWorkExpID: number;
    Company: string;
    EndDate: Date | null;
    JobTitle: string;
    StartDate: Date;
}

export interface ITblBrokerEducation {
  BrokerEducationID: number;
  BrokerID: number | null;
  BrokerRegistrationID: number | null;
  Degree: string;
  EndDate: Date | null;
  School: string;
  StartDate: Date;
}