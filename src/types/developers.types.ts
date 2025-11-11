export interface ITblDevelopers {
    Address: string;
    CommRate: number;
    ContactNumber: string;
    ContactPerson: string;
    DeveloperCode: string;
    DeveloperID: number;
    DeveloperName: string;
    LastUpdate: Date;
    PartialReleaseAmount: number;
    PartialReleaseType: number;
    Position: string;
    ReleaseSchedule: string;
    TaxIDNumber: string;
    UpdateBy: number;
    VATRate: number;
    WtaxRate: number;
}

export interface IAddDeveloper {
    developerCode: string,
    developerName: string
    contactPerson?: string,
    contactNumber?: string, 
    position?: string,
    address?: string,
    partialReleaseType: boolean,
    releaseAmount: number,
    commissionRate: number,
    withholdingTaxRate: number,
    valueAddedTaxRate: number,
    commissionSchedule: string,
    taxIdNumber: string,
}