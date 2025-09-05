import { TblImage } from "../db/db-types";
import { IImage } from "../types/image.types";
import { IAgent, IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentWorkExp, IAgentWorkExpEdit } from "../types/users.types";

export const mapToEditAgent = (data: IAgentEdit): Partial<IAgent> => {
    const dbData: Partial<IAgent> = {}

    if(data.address) dbData.Address = data.address
    if(data.birthdate) dbData.Birthdate = data.birthdate
    if(data.birthplace) dbData.Birthplace = data.birthplace
    if(data.civilStatus) dbData.CivilStatus = data.civilStatus
    if(data.contactNumber) dbData.ContactNumber = data.contactNumber
    if(data.firstName) dbData.FirstName = data.firstName
    if(data.gender) dbData.Sex = data.gender
    if(data.lastName) dbData.LastName = data.lastName
    if(data.middleName) dbData.MiddleName = data.middleName
    if(data.religion) dbData.Religion = data.religion
    if(data.telephoneNumber) dbData.TelephoneNumber = data.telephoneNumber

    return dbData
}

export const mapToImageEdit = (data: IImage): Partial<TblImage> => {
    const dbData: Partial<TblImage> = {}

    if(data.FileName) dbData.Filename = data.FileName
    if(data.ContentType) dbData.ContentType = data.ContentType
    if(data.FileExt) dbData.FileExtension = data.FileExt
    if(data.FileSize) dbData.FileSize = data.FileSize
    if(data.FileContent) dbData.FileContent = data.FileContent

    return dbData
}

export const mapToEditEducation = (data: IAgentEducationEdit): Partial<IAgentEducation> => {
    const dbData: Partial<IAgentEducation> = {}

    if(data.Degree) dbData.Degree = data.Degree
    if(data.EndDate) dbData.EndDate = data.EndDate
    if(data.School) dbData.School = data.School
    if(data.StartDate) dbData.StartDate = data.StartDate

    return dbData
}

export const mapToEditWorkExp = (data: IAgentWorkExpEdit): Partial<IAgentWorkExp> => {
    const dbData: Partial<IAgentWorkExp> = {}

    if(data.Company) dbData.Company = data.Company
    if(data.EndDate) dbData.EndDate = data.EndDate
    if(data.JobTitle) dbData.JobTitle = data.JobTitle
    if(data.StartDate) dbData.StartDate = data.StartDate

    return dbData
}