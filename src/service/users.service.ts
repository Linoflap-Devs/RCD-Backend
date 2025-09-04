import { TblUsers } from "../db/db-types";
import { editAgentDetails, findAgentDetailsByUserId, getAgentDetails, getAgentEducation, getAgentWorkExp, getUsers } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { IAgentEdit } from "../types/users.types";

export const getUsersService = async (): QueryResult<TblUsers[]> => {
    const result = await getUsers();
    return result;
};

export const getUserDetailsService = async (agentUserId: number): QueryResult<any> => {
    const agentUserDetails = await findAgentDetailsByUserId(agentUserId)

    if(!agentUserDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!agentUserDetails.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    const userInfo = {
        firstName: agentUserDetails.data.FirstName?.trim() || '',
        lastName: agentUserDetails.data.LastName?.trim() || '',
        middleName: agentUserDetails.data.MiddleName?.trim() ?? '',
        division: agentUserDetails.data.Division?.trim() || '',
        position: agentUserDetails.data.Position?.trim() || '',
        profileImage: agentUserDetails.data.Image ? agentUserDetails.data.Image : null,
    }

    const agentDetails = await getAgentDetails(agentUserDetails.data.AgentID)

    if(!agentDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No agent found',
            code: 400
        }
    }

    // agent details
    const basicInfo = {
        gender: agentDetails.data.Sex.trim() || '',
        civilStatus: agentDetails.data.CivilStatus.trim() || '',
        religion: agentDetails.data.Religion?.trim() || '',
        birthday: agentDetails.data.Birthdate,
        birthplace: agentDetails.data.Birthplace?.trim() || '',
        address: agentDetails.data.Address.trim(),
        telephoneNumber: agentDetails.data.TelephoneNumber?.trim() || '',
        contactNumber: agentDetails.data.ContactNumber.trim() ,
    }

    // work experience

    const workExpDetails = await getAgentWorkExp(agentUserDetails.data.AgentID)

    if(!workExpDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No work experience found',
            code: 400
        }
    }

    const workExp = workExpDetails.data.map(item => ({
        workExpId: item.AgentWorkExpID,
        company: item.Company,
        jobTitle: item.JobTitle,
        startDate: item.StartDate,
        endDate: item.EndDate
    }))

    // education

    const educationDetails = await getAgentEducation(agentUserDetails.data.AgentID)

    if(!educationDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No education found',
            code: 400
        }
    }

    const education = educationDetails.data.map(item => ({
        educationId: item.AgentEducationID,
        school: item.School,
        degree: item.Degree,
        startDate: item.StartDate,
        endDate: item.EndDate
    }))

    const obj = {
        userInfo: userInfo, 
        basicInfo: basicInfo,
        workExp: workExp,
        education: education
    }

    return {
        success: true,
        data: obj
    }
};

export const editAgentService = async (agentUserId: number, data: IAgentEdit): QueryResult<any> => {

    const agentUserDetails = await findAgentDetailsByUserId(agentUserId)

    if(!agentUserDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!agentUserDetails.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    const result = await editAgentDetails(agentUserDetails.data.AgentID, data)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    return result
}