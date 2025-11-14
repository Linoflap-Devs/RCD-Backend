import { format } from "date-fns";
import { TblBroker, TblUsers, TblUsersWeb } from "../db/db-types";
import { addAgentImage, editAgentDetails, editAgentEducation, editAgentImage, editAgentWorkExp, findAgentDetailsByAgentId, findAgentDetailsByUserId, findAgentUserById, findEmployeeUserById, getAgentDetails, getAgentEducation, getAgentGovIds, getAgentWorkExp, getBrokers, getUsers } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentEducationEditController, IAgentWorkExp, IAgentWorkExpEdit, IAgentWorkExpEditController, NewEducation, NewWorkExp } from "../types/users.types";
import { IImage, IImageBase64 } from "../types/image.types";
import path from "path";
import { logger } from "../utils/logger";
import { getSalesPersonSalesTotalsFn, getUnitManagerSalesTotalsFn } from "../repository/agents.repository";
import { FnAgentSales } from "../types/agent.types";
import { ITblUsersWeb } from "../types/auth.types";
import { ITblBroker } from "../types/brokers.types";

export const getUsersService = async (): QueryResult<ITblUsersWeb[]> => {
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

export const getUserDetailsWebService = async (userWebId: number): QueryResult<any> => {
    const userDetails = await findEmployeeUserById(userWebId)

    if(!userDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    const userInfo = {
        userName: userDetails.data.UserName?.trim() || '',
        branch: userDetails.data.BranchName?.trim() || '',
        position: userDetails.data.Role?.trim() || '',
    }

    return {
        success: true,
        data: userInfo
    }
}

export const getUserDetailsWithValidationService = async (agentUserId: number, targetAgentId: number): QueryResult<any> => {
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

    const targetAgentDetails = await findAgentDetailsByAgentId(targetAgentId)

    if(!targetAgentDetails.success) {
        logger('No user found', {parameter: targetAgentId, details: targetAgentDetails})
        return {
            success: false,
            data: {},
            error: {
                message: 'No user found',
                code: 400
            }
        }
    }

    // validations per role

    if(agentUserDetails.data.Position == 'SALES PERSON'){
        if(targetAgentDetails.data.Position !== 'SALES PERSON'){
            return {
                success: false,
                data: {},
                error: {
                    message: 'You are not authorized to view this agent',
                    code: 400
                }
            }
        }
    }

    if(agentUserDetails.data.Position == 'UNIT MANAGER'){
        if(targetAgentDetails.data.Position !== 'UNIT MANAGER' && targetAgentDetails.data.Position !== 'SALES PERSON'){
            return {
                success: false,
                data: {},
                error: {
                    message: 'You are not authorized to view this agent',
                    code: 400
                }
            }
        }
    }

    const userInfo = {
        firstName: targetAgentDetails.data.FirstName?.trim() || '',
        lastName: targetAgentDetails.data.LastName?.trim() || '',
        middleName: targetAgentDetails.data.MiddleName?.trim() ?? '',
        division: targetAgentDetails.data.Division?.trim() || '',
        position: targetAgentDetails.data.Position?.trim() || '',
        email: targetAgentDetails.data.Email?.trim() || '',
        profileImage: targetAgentDetails.data.Image ? agentUserDetails.data.Image : null,
    }

    const agentDetails = await getAgentDetails(agentUserDetails.data.AgentID)

    // agent details
    const basicInfo = {
        telephoneNumber: agentDetails.data.TelephoneNumber?.trim() || '',
        contactNumber: agentDetails.data.ContactNumber.trim() || '' ,
    }

    const obj = {
        ...userInfo,
        ...basicInfo
    }

    return {
        success: true,
        data: obj
    }
};


export const getAgentGovIdsService = async (agentUserId: number): QueryResult<any> => {
    const result = await findAgentDetailsByUserId(agentUserId)
    if(!result.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!result.data.AgentID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    const govIds = await getAgentGovIds(result.data.AgentID)

    if(!govIds.success){
        return {
            success: false,
            data: {},
            error: govIds.error
        }
    }

    return {
        success: true,
        data: govIds.data
    }
}

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

export const editAgentImageService = async (agentId: number, image: Express.Multer.File): QueryResult<any> => {

    const agentUserDetails = await findAgentDetailsByUserId(agentId)

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

    const filename = `${agentUserDetails.data.LastName}-${agentUserDetails.data.FirstName}_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();
    
    let metadata: IImage = {
        FileName: filename,
        ContentType: image.mimetype,
        FileExt: path.extname(image.originalname),
        FileSize: image.size,
        FileContent: image.buffer
    }

    let result: IImageBase64 | undefined = undefined

    if(agentUserDetails.data.Image){

        // update existing image
        const editImage = await editAgentImage(agentUserDetails.data.Image?.ImageID, metadata)

        if(!editImage.success) return {
            success: false,
            data: {},
            error: editImage.error
        }

        result = editImage.data
    }

    else {
        // add new image + update user agent image id

        const transaction = await addAgentImage(agentUserDetails.data.AgentID, metadata)

        if(!transaction.success) return {
            success: false,
            data: {},
            error: transaction.error
        }

        result = transaction.data
    }

    return {
        success: true,
        data: {}
    }
}

export const editAgentEducationService = async (
    userId: number,
    editInputs: IAgentEducationEditController[],
    createInputs: NewEducation[],
    deleteInputs: number[]
): QueryResult<any> => {
    const agentDetails = await findAgentDetailsByUserId(userId);
    if (!agentDetails.success || !agentDetails.data.AgentID) {
        return { success: false, data: {}, error: { message: 'No agent found', code: 400 } };
    }

    const userDetails = await findAgentUserById(userId);
    if (!userDetails.success || !userDetails.data.agentRegistrationId) {
        return { success: false, data: {}, error: { message: 'No agent registration found', code: 400 } };
    }

    if (editInputs.length === 0 && createInputs.length === 0 && deleteInputs.length === 0) {
        return { success: false, data: {}, error: { message: 'No changes detected', code: 400 } };
    }

    // Validate and format creates
    const validCreates: IAgentEducation[] = [];
    for (const edu of createInputs) {
        function isValidDate(dateString: string | Date) {
            if (!dateString) return false;
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date.getTime());
        }
        
        if (!edu.School) return { success: false, data: {}, error: { message: 'School not found', code: 400 } };
        if (!edu.Degree) return { success: false, data: {}, error: { message: 'Degree not found', code: 400 } };
        if (!edu.StartDate) return { success: false, data: {}, error: { message: 'Start date not found', code: 400 } };

        if (!isValidDate(edu.StartDate)) return { success: false, data: {}, error: { message: 'Invalid start date', code: 400 } };
        if (edu.EndDate && !isValidDate(edu.EndDate)) return { success: false, data: {}, error: { message: 'Invalid end date', code: 400 } };


        validCreates.push({
            AgentID: agentDetails.data.AgentID,
            AgentRegistrationID: userDetails.data.agentRegistrationId,
            AgentEducationID: 0, // Assuming auto-gen
            Degree: edu.Degree,
            EndDate: edu.EndDate || null,
            School: edu.School,
            StartDate: edu.StartDate
        });
    }

    // Validate and format edits (partial)
    const validEdits: IAgentEducationEdit[] = [];
    for (const edu of editInputs) {
        if (!edu.agentEducationID) {
            return { success: false, data: {}, error: { message: 'Agent education id not found', code: 400 } };
        }

        validEdits.push({
            AgentRegistrationID: userDetails.data.agentRegistrationId,
            AgentEducationID: edu.agentEducationID,
            Degree: edu.degree,
            EndDate: edu.endDate || null,
            School: edu.school,
            StartDate: edu.startDate,
        });
    }

    const result = await editAgentEducation(agentDetails.data.AgentID, validEdits, validCreates, deleteInputs);

    if (!result.success) {
        return { success: false, data: {}, error: result.error };
    }

    return { success: true, data: result.data };
};

export const editAgentWorkExpService = async (
    userId: number,
    editInputs: IAgentWorkExpEditController[],
    createInputs: NewWorkExp[],
    deleteInputs: number[]
): QueryResult<any> => {
    const agentDetails = await findAgentDetailsByUserId(userId);
    if (!agentDetails.success || !agentDetails.data.AgentID) {
        return { success: false, data: {}, error: { message: 'No agent found', code: 400 } };
    }

    const userDetails = await findAgentUserById(userId);
    if (!userDetails.success || !userDetails.data.agentRegistrationId) {
        return { success: false, data: {}, error: { message: 'No agent registration found', code: 400 } };
    }

    if (editInputs.length === 0 && createInputs.length === 0 && deleteInputs.length === 0) {
        return { success: false, data: {}, error: { message: 'No changes detected', code: 400 } };
    }

    // Validate and format creates
    const validCreates: IAgentWorkExp[] = [];
    for (const work of createInputs) {
        function isValidDate(dateString: string | Date) {
            if (!dateString) return false;
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date.getTime());
        }

        if (!work.Company) return { success: false, data: {}, error: { message: 'Company not found', code: 400 } };
        if (!work.JobTitle) return { success: false, data: {}, error: { message: 'Job Title not found', code: 400 } };
        if (!work.StartDate) return { success: false, data: {}, error: { message: 'Start date not found', code: 400 } };

        if (!isValidDate(work.StartDate)) return { success: false, data: {}, error: { message: 'Invalid start date', code: 400 } };
        if (work.EndDate && !isValidDate(work.EndDate)) return { success: false, data: {}, error: { message: 'Invalid end date', code: 400 } };


        validCreates.push({
            AgentID: agentDetails.data.AgentID,
            AgentRegistrationID: userDetails.data.agentRegistrationId,
            AgentWorkExpID: 0, // Assuming auto-gen
            Company: work.Company,
            EndDate: work.EndDate || null,
            JobTitle: work.JobTitle,
            StartDate: work.StartDate
        });
    }

    // Validate and format edits (partial)
    const validEdits: IAgentWorkExpEdit[] = [];
    for (const work of editInputs) {
        if (!work.agentWorkExpID) {
            return { success: false, data: {}, error: { message: 'Agent work exp id not found', code: 400 } };
        }

        validEdits.push({
            AgentRegistrationID: userDetails.data.agentRegistrationId,
            AgentWorkExpID: work.agentWorkExpID,
            Company: work.company,
            EndDate: work.endDate || null,
            JobTitle: work.jobTitle,
            StartDate: work.startDate
        });
    }

    const result = await editAgentWorkExp(agentDetails.data.AgentID, validEdits, validCreates, deleteInputs);

    if (!result.success) {
        return { success: false, data: {}, error: result.error };
    }

    return { success: true, data: result.data };
};

export const getBrokersService = async (): QueryResult<ITblBroker[]> => {
    const result = await getBrokers();

    if (!result.success) {
        return { success: false, data: [], error: result.error };
    }

    return { success: true, data: result.data };
}

export const top10UMsService = async (date?: Date): QueryResult<any> => {
    // top 10 unit managers
    const top10Ums = await getUnitManagerSalesTotalsFn(
        [ 
            { field: 'CurrentMonth', direction: 'desc' },
            { field: 'AgentName', direction: 'asc' }
        ],
        10,
        date ? new Date(date) : undefined
    )
    
    if(!top10Ums.success){
        return {
            success: false,
            data: [],
            error: top10Ums.error
        }
    }

    const top10UmsFormat = top10Ums.data.map((um: FnAgentSales) => ({AgentName: um.AgentName, CurrentMonth: um.CurrentMonth}))

    return {
        success: true,
        data: top10UmsFormat
    }

}

export const top10SPsService = async (date?: Date): QueryResult<any> => {
    // top 10 unit managers
    const top10Sps = await getSalesPersonSalesTotalsFn(
        [
            { field: 'CurrentMonth', direction: 'desc' },
            { field: 'AgentName', direction: 'asc' }
        ],
        10,
        date ? new Date(date) : undefined
    )
    
    if(!top10Sps.success){
        return {
            success: false,
            data: [],
            error: top10Sps.error
        }
    }
    const top10SpsFormat = top10Sps.data.map((sp: FnAgentSales) => ({AgentName: sp.AgentName, CurrentMonth: sp.CurrentMonth}))

    return {
        success: true,
        data: top10SpsFormat
    }

}

