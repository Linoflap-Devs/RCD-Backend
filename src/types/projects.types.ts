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