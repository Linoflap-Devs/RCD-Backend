import { IAgent, IAgentEdit } from "../types/users.types";

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