import { TblDevCommRate, TblDevelopers, VwProjects } from "../db/db-types";

export interface VwProjectDeveloper {
    Address: string;
    ContactNumber: string;
    DeveloperID: number;
    DeveloperName: string | null;
    IsLeadProject: number;
    LastUpdate: Date;
    ProjectCode: string;
    ProjectID: number;
    ProjectName: string;
    ProjectTypeID: number;
    ProjectTypeName: string | null;
    SectorID: number;
    SectorName: string;
    UpdateBy: number;

    CommRate: number | null;
    ContactPerson: string | null;
    DeveloperCode: string | null;
    PartialReleaseAmount: number | null;
    PartialReleaseType: number | null;
    Position: string | null;
    ReleaseSchedule: string | null;
    TaxIDNumber: string | null;
    VATRate: number | null;
    WtaxRate: number | null;
}

export interface IAddProject {
    Address: string;
    ContactNumber: string;
    DeveloperID: number;
    IsLeadProject: boolean;
    ProjectCode: string;
    ProjectName: string;
    ProjectTypeID: number;
    SectorID: number;
}

export interface ITblProjectTypes {
    IsActive: number;
    LastUpdate: Date;
    ProjectTypeCode: string;
    ProjectTypeID: number;
    ProjectTypeName: string;
    UpdateBy: number;
}


export interface ITblProjects {
  Address: string;
  ContactNumber: string;
  DeveloperID: number;
  IsLeadProject: number;
  LastUpdate: Date;
  ProjectCode: string;
  ProjectID: number;
  ProjectName: string;
  ProjectTypeID: number;
  SectorID: number;
  UpdateBy: number;
}