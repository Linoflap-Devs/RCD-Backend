import { format } from "date-fns";
import { TblBroker, TblUsers, TblUsersWeb, VwAgents } from "../db/db-types";
import { addAgentImage, editAgentDetails, editAgentEducation, editAgentImage, editAgentWorkExp, editBrokerDetails, editBrokerEducation, editBrokerWorkExp, findAgentDetailsByAgentId, findAgentDetailsByUserId, findAgentUserById, findBrokerDetailsByUserId, findEmployeeUserById, getAgentDetails, getAgentEducation, getAgentGovIds, getAgentUsers, getAgentWorkExp, getBrokerGovIds, getUsers, unlinkAgentUser, unlinkBrokerUser } from "../repository/users.repository";
import { QueryResult } from "../types/global.types";
import { IAgent, IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentEducationEditController, IAgentWorkExp, IAgentWorkExpEdit, IAgentWorkExpEditController, IBrokerEducationEditController, IBrokerWorkExpEditController, IMobileAccount, NewEducation, NewWorkExp } from "../types/users.types";
import { IImage, IImageBase64, TblImageWithId } from "../types/image.types";
import path from "path";
import { logger } from "../utils/logger";
import { addAgent, getAgentBrokers, getAgentByCode, getAgentImages, getAgentRegistration, getAgentRegistrations, getAgentRegistrationWithoutUser, getAgents, getSalesPersonSalesTotalsFn, getUnitManagerSalesTotalsFn } from "../repository/agents.repository";
import { FnAgentSales, ITblAgent } from "../types/agent.types";
import { IAgentRegistration, IInviteTokens, ITblAgentUser, ITblBrokerUser, ITblUsersWeb } from "../types/auth.types";
import { IAddBroker, IBroker, IBrokerRegistration, IBrokerRegistrationListItem, IEditBroker, ITblBroker, ITblBrokerEducation, ITblBrokerRegistration, ITblBrokerWorkExp } from "../types/brokers.types";
import { addBroker, addBrokerImage, deleteBroker, editBroker, editBrokerImage, getBrokerByCode, getBrokerEducation, getBrokerRegistration, getBrokerRegistrationByUserId, getBrokerRegistrations, getBrokers, getBrokerUsers, getBrokerWithUser, getBrokerWorkExp } from "../repository/brokers.repository";
import { getPositions } from "../repository/position.repository";
import { getMultipleTotalPersonalSales, getTotalPersonalSales } from "../repository/sales.repository";
import { editDivisionBroker, getDivisionBrokers } from "../repository/division.repository";
import { IBrokerDivision } from "../types/division.types";
import { ITblAgentTaxRates } from "../types/tax.types";
import { getAgentTaxRate } from "../repository/tax.repository";
import { findInviteToken, findInviteTokenWithRegistration } from "../repository/auth.repository";
import { TZDate } from "@date-fns/tz";

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

    let brokerDivisions: {divisionId: number, divisionName: string}[] = []

    // broker divisions
    const brokerPositions = await getPositions( { positionName: 'BROKER' })

    if(brokerPositions.success && brokerPositions.data[0].PositionID == agentUserDetails.data.PositionID){
        const divisions = await getDivisionBrokers({ agentIds: [agentUserDetails.data.AgentID] })

        if(divisions.success){
            brokerDivisions = divisions.data.map(item => ({
                divisionId: item.DivisionID,
                divisionName: item.DivisionName
            }))
        }
    }

    const obj = {
        userInfo: userInfo, 
        basicInfo: basicInfo,
        workExp: workExp,
        education: education,
        ...( brokerPositions.data[0].PositionID == agentUserDetails.data.PositionID && { brokerDivisions: brokerDivisions })
    }

    return {
        success: true,
        data: obj
    }
};

export const getBrokerDetailsService = async (brokerUserId: number): QueryResult<any> => {
    const brokerUserDetails = await findBrokerDetailsByUserId(brokerUserId)

    if(!brokerUserDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!brokerUserDetails.data.BrokerID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No broker found',
                code: 400
            }
        }
    }

    const userInfo = {
        name: brokerUserDetails.data.RepresentativeName,
        position: 'BROKER',
        profileImage: brokerUserDetails.data.Image ? brokerUserDetails.data.Image : null,
    }

    const brokerDetails = await getBrokerRegistrationByUserId(brokerUserId)

    if(!brokerDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No broker found',
            code: 400
        }
    }

    // agent details
    const basicInfo = {
        gender: brokerDetails.data.Sex.trim() || '',
        civilStatus: brokerUserDetails.data.CivilStatus || brokerDetails.data.CivilStatus.trim() || '',
        religion: brokerUserDetails.data.Religion || brokerDetails.data.Religion?.trim() || '',
        birthday: brokerUserDetails.data.Birthdate || brokerDetails.data.Birthdate,
        birthplace: brokerUserDetails.data.Birthplace || brokerDetails.data.Birthplace?.trim() || '',
        address: brokerUserDetails.data.Address || brokerDetails.data.Address.trim(),
        telephoneNumber: brokerUserDetails.data.TelephoneNumber || brokerDetails.data.TelephoneNumber?.trim() || '',
        contactNumber: brokerUserDetails.data.ContactNumber || brokerDetails.data.ContactNumber.trim(),
        emergencyPerson: brokerUserDetails.data.PersonEmergency || brokerDetails.data.PersonEmergency?.trim() || '',
        emergencyContact: brokerUserDetails.data.ContactEmergency || brokerDetails.data.ContactEmergency.trim() || '',
        emergencyAddress: brokerUserDetails.data.AddressEmergency || brokerDetails.data.AddressEmergency.trim() || '',
        affiliation: brokerUserDetails.data.Affiliation || brokerDetails.data.AffiliationDate || '',
    }

    // work experience

    const workExpDetails = await getBrokerWorkExp(brokerUserId)

    if(!workExpDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No work experience found',
            code: 400
        }
    }

    const workExp = workExpDetails.data.map(item => ({
        workExpId: item.BrokerWorkExpID,
        company: item.Company,
        jobTitle: item.JobTitle,
        startDate: item.StartDate,
        endDate: item.EndDate
    }))

    // education

    const educationDetails = await getBrokerEducation(brokerUserId)

    if(!educationDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No education found',
            code: 400
        }
    }

    const education = educationDetails.data.map(item => ({
        educationId: item.BrokerEducationID,
        school: item.School,
        degree: item.Degree,
        startDate: item.StartDate,
        endDate: item.EndDate
    }))

    let brokerDivisions: {divisionId: number, divisionName: string}[] = []

    // broker divisions
    const divisions = await getDivisionBrokers({ brokerIds: [brokerUserDetails.data.BrokerID] })

    if(divisions.success){
        brokerDivisions = divisions.data.map(item => ({
            divisionId: item.DivisionID,
            divisionName: item.DivisionName
        }))
    }

    const obj = {
        userInfo: userInfo, 
        basicInfo: basicInfo,
        workExp: workExp,
        education: education,
        brokerDivisions: brokerDivisions
    }

    return {
        success: true,
        data: obj
    }
}

export const lookupBrokerDetailsService = async (brokerId: number): QueryResult<any> => {

    const [
        brokerWithUserResult,
        registrationResult,
        brokerEducation,
        brokerWork
    ] = await Promise.all([
        getBrokerWithUser(brokerId),
        getBrokerRegistration({brokerId: brokerId}),
        getBrokerEducation(brokerId),
        getBrokerWorkExp(brokerId)
    ])

    console.log(brokerWithUserResult, registrationResult, brokerEducation, brokerWork)

    let backupBrokerData: ITblBroker | undefined = undefined

    if(!brokerWithUserResult.success){

        const broker = await getBrokers({brokerId: brokerId})

        if(!broker.success){
            return {
                success: false,
                data: null,
                error: broker.error
            }
        }

        backupBrokerData = broker.data[0]
        // return {
        //     success: false,
        //     data: null,
        //     error: brokerWithUserResult.error
        // }
    }

    const imageIds = []
    imageIds.push(brokerWithUserResult.data.user.ImageID || null)
    imageIds.push(registrationResult.data.SelfieImageID || null)
    imageIds.push(registrationResult.data.GovImageID || null)

    // images

    const brokerImages = await getAgentImages(imageIds.filter(id => id != null) as number[])
    const formattedImages = brokerImages.data.map((img: TblImageWithId) => {
            return {
                ...img,
                FileContent: img.FileContent.toString('base64')
            }
    })

    // divisions

    let allowedDivisions: { DivisionID: number, DivisionName: string}[] = []

    const divisions = await getDivisionBrokers({brokerIds: [brokerId]})

    if(divisions.success){
        divisions.data.map((item: IBrokerDivision) => {
            allowedDivisions.push({
                DivisionID: item.DivisionID,
                DivisionName: item.DivisionName
            })
        })
    }

    // tax rate
    let agentTaxRate: Partial<ITblAgentTaxRates> = {}
    if(brokerWithUserResult.data || backupBrokerData){

        const taxRate = await getAgentTaxRate({ agentTaxRateIds: [brokerWithUserResult.data.broker.BrokerTaxRate || backupBrokerData?.BrokerTaxRate || 0] })

        if(taxRate.success && taxRate.data.length > 0){
            const item = taxRate.data[0]
            agentTaxRate = {
                AgentTaxRateID: item.AgentTaxRateID,
                AgentTaxRateCode: item.AgentTaxRateCode,
                AgentTaxRateName: item.AgentTaxRateName,
                VATRate: item.VATRate,
                WtaxRAte: item.WtaxRAte
            }
        }
    }

    const obj = {
        broker: brokerWithUserResult.success ? brokerWithUserResult.data.broker : backupBrokerData,
        registrationResult: {
            ...registrationResult.data,
            experience: brokerWork.data,
            education: brokerEducation.data,
        },
        taxRate: agentTaxRate,
        divisions: allowedDivisions,
        images: formattedImages
    }

    return {
        success: true,
        data: obj
    }
}

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

    // if(agentUserDetails.data.Position == 'SALES PERSON'){
    //     if(targetAgentDetails.data.Position !== 'SALES PERSON'){
    //         return {
    //             success: false,
    //             data: {},
    //             error: {
    //                 message: 'You are not authorized to view this agent',
    //                 code: 400
    //             }
    //         }
    //     }
    // }

    // if(agentUserDetails.data.Position == 'UNIT MANAGER'){
    //     if(targetAgentDetails.data.Position !== 'UNIT MANAGER' && targetAgentDetails.data.Position !== 'SALES PERSON'){
    //         return {
    //             success: false,
    //             data: {},
    //             error: {
    //                 message: 'You are not authorized to view this agent',
    //                 code: 400
    //             }
    //         }
    //     }
    // }

    const userInfo = {
        firstName: targetAgentDetails.data.FirstName?.trim() || '',
        lastName: targetAgentDetails.data.LastName?.trim() || '',
        middleName: targetAgentDetails.data.MiddleName?.trim() ?? '',
        division: targetAgentDetails.data.Division?.trim() || '',
        position: targetAgentDetails.data.Position?.trim() || '',
        email: targetAgentDetails.data.Email?.trim() || '',
        profileImage: targetAgentDetails.data.Image || null,
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

export const getBrokersGovIdsService = async (brokerUserId: number): QueryResult<any> => {
    const result = await findBrokerDetailsByUserId(brokerUserId)
    if(!result.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!result.data.BrokerID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No broker found',
                code: 400
            }
        }
    }

    const govIds = await getBrokerGovIds(result.data.BrokerID)

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

    const result = await editAgentDetails(agentUserDetails.data.AgentID, data, agentUserDetails.data)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    return result
}

export const editBrokerService = async (brokerUserId: number, data: Partial<IEditBroker>): QueryResult<any> => {
    const brokerUserDetails = await findBrokerDetailsByUserId(brokerUserId)
    if(!brokerUserDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!brokerUserDetails.data.BrokerID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No broker found',
                code: 400
            }
        }
    }

    const mappedData: Partial<ITblBroker> = {
        RepresentativeName: data.name,
        Address: data.address,
        TelephoneNumber: data.telephoneNumber,
        ContactNumber: data.contactNumber,
        CivilStatus: data.civilStatus,
        Religion: data.religion,
        Birthdate: data.birthdate,
        Birthplace: data.birthplace,
    }

    const result = await editBrokerDetails(brokerUserDetails.data.BrokerID, mappedData, brokerUserDetails.data)

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

    const agentUser = await findAgentUserById(agentId)

    if(!agentUser.success) {
        return {
            success: false,
            data: {},
            error: agentUser.error
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

    console.log(agentUserDetails.data)
    console.log(agentUser.data)

    if(agentUser.data.imageId && agentUserDetails.data.Image){
        console.log('existing image')
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
        console.log('new image')
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

export const editBrokerImageService = async (brokerId: number, image: Express.Multer.File): QueryResult<any> => {

    const brokerUserDetails = await findBrokerDetailsByUserId(brokerId)

    if(!brokerUserDetails.success) return {
        success: false,
        data: {},
        error: {
            message: 'No user found',
            code: 400
        }
    }

    if(!brokerUserDetails.data.BrokerID){
        return {
            success: false,
            data: {},
            error: {
                message: 'No broker found',
                code: 400
            }
        }
    }

    const name = brokerUserDetails.data.RepresentativeName
        .toLowerCase()
        .replace(/[^a-z\s]/g, '') // Remove anything that's not a letter or space
        .split(' ')
        .filter(part => part) // Remove empty strings from double spaces
        .join('-');

    const filename = `${name}_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();
    
    let metadata: IImage = {
        FileName: filename,
        ContentType: image.mimetype,
        FileExt: path.extname(image.originalname),
        FileSize: image.size,
        FileContent: image.buffer
    }

    let result: IImageBase64 | undefined = undefined

    if(brokerUserDetails.data.Image){

        // update existing image
        const editImage = await editBrokerImage(brokerUserDetails.data.Image?.ImageID, metadata)

        if(!editImage.success) return {
            success: false,
            data: {},
            error: editImage.error
        }

        result = editImage.data
    }

    else {
        // add new image + update user agent image id

        const transaction = await addBrokerImage(brokerUserDetails.data.BrokerID, metadata)

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

export const editBrokerEducationService = async (
    userId: number,
    editInputs: IBrokerEducationEditController[],
    createInputs: NewEducation[],
    deleteInputs: number[]
): QueryResult<any> => {
    const brokerDetails = await findBrokerDetailsByUserId(userId);
    if (!brokerDetails.success || !brokerDetails.data.BrokerID) {
        return { success: false, data: {}, error: { message: 'No agent found', code: 400 } };
    }

    const userDetails = await findBrokerDetailsByUserId(userId);
    if (!userDetails.success || !userDetails.data.BrokerRegistrationID) {
        return { success: false, data: {}, error: { message: 'No broker registration found', code: 400 } };
    }

    if (editInputs.length === 0 && createInputs.length === 0 && deleteInputs.length === 0) {
        return { success: false, data: {}, error: { message: 'No changes detected', code: 400 } };
    }

    // Validate and format creates
    const validCreates: ITblBrokerEducation[] = [];
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
            BrokerID: brokerDetails.data.BrokerID,
            BrokerRegistrationID: userDetails.data.BrokerRegistrationID,
            BrokerEducationID: 0, // Assuming auto-gen
            Degree: edu.Degree,
            EndDate: edu.EndDate || null,
            School: edu.School,
            StartDate: edu.StartDate
        });
    }

    // Validate and format edits (partial)
    const validEdits: Partial<ITblBrokerEducation>[] = [];
    for (const edu of editInputs) {
        if (!edu.brokerEducationID) {
            return { success: false, data: {}, error: { message: 'Agent education id not found', code: 400 } };
        }

        validEdits.push({
            BrokerRegistrationID: userDetails.data.BrokerRegistrationID,
            BrokerEducationID: edu.brokerEducationID,
            Degree: edu.degree,
            EndDate: edu.endDate || null,
            School: edu.school,
            StartDate: edu.startDate,
        });
    }

    const result = await editBrokerEducation(brokerDetails.data.BrokerID, validEdits, validCreates, deleteInputs);

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

export const editBrokerWorkExpService = async (
    userId: number,
    editInputs: IBrokerWorkExpEditController[],
    createInputs: NewWorkExp[],
    deleteInputs: number[]
): QueryResult<any> => {
    const brokerDetails = await findBrokerDetailsByUserId(userId);
    if (!brokerDetails.success || !brokerDetails.data.BrokerID) {
        return { success: false, data: {}, error: { message: 'No broker found', code: 400 } };
    }

    const userDetails = await findBrokerDetailsByUserId(userId);
    if (!userDetails.success || !userDetails.data.BrokerRegistrationID) {
        return { success: false, data: {}, error: { message: 'No broker registration found', code: 400 } };
    }

    if (editInputs.length === 0 && createInputs.length === 0 && deleteInputs.length === 0) {
        return { success: false, data: {}, error: { message: 'No changes detected', code: 400 } };
    }

    // Validate and format creates
    const validCreates: ITblBrokerWorkExp[] = [];
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
            BrokerID: brokerDetails.data.BrokerID,
            BrokerRegistrationID: userDetails.data.BrokerRegistrationID,
            BrokerWorkExpID: 0, // Assuming auto-gen
            Company: work.Company,
            EndDate: work.EndDate || null,
            JobTitle: work.JobTitle,
            StartDate: work.StartDate
        });
    }

    // Validate and format edits (partial)
    const validEdits: Partial<ITblBrokerWorkExp>[] = [];
    for (const work of editInputs) {
        if (!work.brokerWorkExpID) {
            return { success: false, data: {}, error: { message: 'Broker work exp id not found', code: 400 } };
        }

        validEdits.push({
            BrokerRegistrationID: userDetails.data.BrokerRegistrationID,
            BrokerWorkExpID: work.brokerWorkExpID,
            Company: work.company,
            EndDate: work.endDate || null,
            JobTitle: work.jobTitle,
            StartDate: work.startDate
        });
    }

    const result = await editBrokerWorkExp(brokerDetails.data.BrokerID, validEdits, validCreates, deleteInputs);

    if (!result.success) {
        return { success: false, data: {}, error: result.error };
    }

    return { success: true, data: result.data };
};

export const getBrokersService = async (
    showSales: boolean = false, 
    filters?: { month?: number; year?: number }
): QueryResult<{
    BrokerID?: number | null;
    AgentID?: number | null;
    BrokerCode?: string | null;
    AgentCode?: string | null;
    Broker: string;
    Divisions: { DivisionID: number; DivisionName: string }[];
    PersonalSales?: number;
}[]> => {
    // Fetch brokers and agents in parallel
    const [extBrokers, intBrokers] = await Promise.all([
        getBrokers(),
        getAgentBrokers()
    ]);

    // Early return on errors
    if (!extBrokers.success) return { success: false, data: [], error: extBrokers.error };
    if (!intBrokers.success) return { success: false, data: [], error: intBrokers.error };

    // Fetch divisions
    const divisions = await getDivisionBrokers({ 
        agentIds: intBrokers.data.map((a: any) => a.AgentID), 
        brokerIds: extBrokers.data.map((b: any) => b.BrokerID) 
    });

    if (!divisions.success) return { success: false, data: [], error: divisions.error };

    // Create division lookup maps for O(1) access
    const extBrokerDivisionsMap = new Map<number, { DivisionID: number; DivisionName: string }[]>();
    const intBrokerDivisionsMap = new Map<number, { DivisionID: number; DivisionName: string }[]>();

    divisions.data.forEach((d: IBrokerDivision) => {
        const divisionInfo = { DivisionID: d.DivisionID, DivisionName: d.DivisionName };
        
        if (d.BrokerID) {
        const existing = extBrokerDivisionsMap.get(d.BrokerID) || [];
        extBrokerDivisionsMap.set(d.BrokerID, [...existing, divisionInfo]);
        }
        
        if (d.AgentID) {
        const existing = intBrokerDivisionsMap.get(d.AgentID) || [];
        intBrokerDivisionsMap.set(d.AgentID, [...existing, divisionInfo]);
        }
    });

    // Conditionally fetch sales data only if showSales is true
    let extBrokerSalesMap = new Map<string, number>();
    let intBrokerSalesMap = new Map<number, number>();

    if (showSales) {
        const [extBrokerSales, intBrokerSales] = await Promise.all([
            getMultipleTotalPersonalSales(
                { brokerNames: extBrokers.data.map((b: any) => b.RepresentativeName) },
                filters
            ),
            getMultipleTotalPersonalSales(
                { agentIds: intBrokers.data.map((a: any) => a.AgentID) },
                filters
            )
        ]);

        // Create lookup maps for O(1) access
        if (extBrokerSales.success) {
            extBrokerSalesMap = new Map(
                extBrokerSales.data.map((s: any) => [s.AgentName, s.TotalSales || 0])
            );
        }
        if (intBrokerSales.success) {
            intBrokerSalesMap = new Map(
                intBrokerSales.data.map((s: any) => [s.AgentID, s.TotalSales || 0])
            );
        }
    }

    // Format external brokers
    const extFormatted = extBrokers.data.map((broker: ITblBroker) => ({
        BrokerID: broker.BrokerID,
        AgentID: null,
        BrokerCode: broker.BrokerCode,
        AgentCode: null,
        Broker: broker.RepresentativeName,
        AgentRegistrationID: null,
        Email: broker.Email || null, 
        BrokerRegistrationID: broker.BrokerRegistrationID || null,
        TaxRate: broker.BrokerTaxRate || 0,
        Divisions: extBrokerDivisionsMap.get(broker.BrokerID) || [],
        ...(showSales && { PersonalSales: extBrokerSalesMap.get(broker.RepresentativeName) || 0 })
    }));

    // Format internal brokers
    const intFormatted = intBrokers.data.map((agent: IAgent) => ({
        BrokerID: null,
        AgentID: agent.AgentID,
        BrokerCode: null,
        AgentCode: agent.AgentCode,
        Broker: agent.FullName || `${agent.LastName.trim()}, ${agent.FirstName.trim()} ${agent.MiddleName.trim()}`.trim(),
        AgentRegistrationID: agent.AgentRegistrationID || null,
        BrokerRegistrationID: null,
        TaxRate: agent.AgentTaxRate || 0,
        Email: agent.Email || null,
        Divisions: intBrokerDivisionsMap.get(agent.AgentID) || [],
        ...(showSales && { PersonalSales: intBrokerSalesMap.get(agent.AgentID) || 0 })
    }));

    return { 
        success: true, 
        data: [...extFormatted, ...intFormatted] 
    };
};
export const getBrokerRegistrationsService = async (brokerId?: number): QueryResult<IBrokerRegistrationListItem[]> => {

    console.log("brokerId", brokerId)

    const brokerPosition = await getPositions({positionName: 'BROKER'})
    if(!brokerPosition.success || brokerPosition.data.length === 0){
        return {
            success: false,
            data: [],
            error: brokerPosition.error
        }
    }

    const [
        handsOffRegistrations,
        handsOnRegistrations
    ] = await Promise.all([
        getBrokerRegistrations({ isVerified: 1}),
        getAgentRegistrations({ isVerified: 1, positionID: brokerPosition.data[0].PositionID })
    ])

    if(!handsOffRegistrations.success || !handsOnRegistrations.success){
        return {
            success: false,
            data: [],
            error: handsOffRegistrations.error || handsOnRegistrations.error
        }
    }

    const handsOff: IBrokerRegistrationListItem[] = handsOffRegistrations.data.map((item: IBrokerRegistration) => ({
        AgentRegistrationID: null,
        BrokerRegistrationID: item.BrokerRegistrationID,
        RepresentativeName: `${item.LastName.trim()}, ${item.FirstName.trim()} ${item.MiddleName?.trim()}`.trim(),
        Email: item.Email,
        Gender: item.Gender,
        ContactNumber: item.ContactNumber
    }))

    const handsOn: IBrokerRegistrationListItem[] = handsOnRegistrations.data.result.map((item: IAgentRegistration) => {
        return {
            AgentRegistrationID: item.AgentRegistrationID,
            BrokerRegistrationID: null,
            RepresentativeName: `${item.LastName.trim()}, ${item.FirstName.trim()} ${item.MiddleName?.trim()}`.trim(),
            Email: item.Email,
            Gender: item.Gender,
            ContactNumber: item.ContactNumber || null
        }
    })

    return {
        success: true,
        data: [ ...handsOff, ...handsOn ]
    }
}

export const lookupBrokerRegistrationService = async (brokerRegistrationId: number): QueryResult<IBrokerRegistration> => {

    const brokerRegistration = await getBrokerRegistrations({brokerRegistrationId: brokerRegistrationId})

    if(!brokerRegistration.success){
        return {
            success: false,
            data: {} as IBrokerRegistration,
            error: brokerRegistration.error
        }
    }

    console.log(brokerRegistration)

    return {
        success: true,
        data: brokerRegistration.data[0]
    }
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

export const getAgentUsersService = async (): QueryResult<Partial<ITblAgentUser>[]> => {

    const result = await getAgentUsers()

    if (!result.success) {
        return { success: false, data: [], error: result.error };
    }

    const obj: Partial<ITblAgentUser>[] = result.data.map((user: ITblAgentUser) => {
        return {
            AgentUserID: user.AgentUserID,
            Email: user.Email,
            IsVerified: user.IsVerified,
            ImageID: user.ImageID,
            AgentID: user.AgentID,
            AgentRegistrationID: user.AgentRegistrationID
        }
    });

    return { success: true, data: obj };
}

export const addBrokerService = async (userId: number, data: IAddBroker) => {

    let result: ITblBroker | ITblAgent | undefined = undefined 

    if(data.BrokerType === 'hands-on'){

        const mappedData = {
            ...data,
            AgentCode: data.BrokerCode,
            AgentTaxRate: data.BrokerTaxRate
        }

        const existingAgent = await getAgentByCode(mappedData.AgentCode)
    
        if(existingAgent.success){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Agent broker code already exists.'
                }
            }
        }
    
        const position = await getPositions({positionName: 'BROKER'})

        if(position.success){
            mappedData.PositionID = position.data[0].PositionID
        }
    
        const agentResult = await addAgent(userId, mappedData)
    
        if(!agentResult.success){
            return {
                success: false,
                data: {},
                error: agentResult.error
            }
        }

        result = agentResult.data
    }

    else if (data.BrokerType === 'hands-off'){
        
        const existingBroker = await getBrokerByCode(data.BrokerCode)
    
        if(existingBroker.success){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Broker code already exists.'
                }
            }
        }
    
        if(!data.PositionID){
            const position = await getPositions({positionName: 'BROKER'})
    
            if(position.success){
                data.PositionID = position.data[0].PositionID
            }
        }
    
    
        const brokerResult = await addBroker(userId, data)
    
        if(!brokerResult.success){
            return {
                success: false,
                data: {},
                error: brokerResult.error
            }
        }

        result = brokerResult.data
    }


    return {
        success: true,
        data: result
    }
}

export const editWebBrokerService = async (userId: number, brokerId: number, data: Partial<ITblBroker & {LastName?: string, FirstName?: string, MiddleName?: string}>, divisions?: number[]): QueryResult<ITblBroker> => {

    const brokerData = await getBrokers({brokerId: brokerId})

    if(!brokerData.success || brokerData.data.length == 0){
        return {
            success: false,
            data: {} as ITblBroker,
            error: {
                code: 400,
                message: 'Broker not found.'
            }
        }
    }

    if(data.BrokerCode){
        const existingBroker = await getBrokerByCode(data.BrokerCode)
        
        if(existingBroker.success){
            return {
                success: false,
                data: {} as ITblBroker,
                error: {
                    code: 400,
                    message: 'Broker code already exists.'
                }
            }
        }
    }
    
    const result = await editBroker(userId, brokerId, data)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblBroker,
            error: result.error
        }
    }

    if(divisions){
        const divisionsResult = await editDivisionBroker(userId, divisions, { brokerId: brokerId })
        if(!divisionsResult.success){
            return {
                success: false,
                data: {} as ITblBroker,
                error: divisionsResult.error
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
    
}

export const deleteWebBrokerService = async (userId: number, brokerId: number): QueryResult<ITblBroker> => {

    const brokerData = await getBrokers({brokerId: brokerId})

    if(!brokerData.success || brokerData.data.length == 0){
        return {
            success: false,
            data: {} as ITblBroker,
            error: {
                code: 400,
                message: 'Broker not found.'
            }
        }
    }

    const result = await deleteBroker(userId, brokerId) 

    if(!result.success){
        return {
            success: false,
            data: {} as ITblBroker,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const unlinkAgentUserService = async (userId: number, agentUserId: number) : QueryResult<ITblAgentUser> => {
    const details = await findAgentDetailsByUserId(agentUserId)

    if(!details.success || !details.data.AgentID){
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: {
                code: 400,
                message: 'Agent user not found.'
            }
        }
    }

    const result = await unlinkAgentUser(userId, agentUserId)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const unlinkBrokerUserService = async (userId: number, brokerUserId: number) : QueryResult<ITblBrokerUser> => {
    const details = await findBrokerDetailsByUserId(brokerUserId)

    if(!details.success || !details.data.BrokerID){
        return {
            success: false,
            data: {} as ITblBrokerUser,
            error: {
                code: 400,
                message: 'Broker user not found.'
            }
        }
    }

    const result = await unlinkBrokerUser(userId, brokerUserId)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblBrokerUser,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}

export const getMobileAccountsService = async (): QueryResult<IMobileAccount[]> => {
    
    const position = await getPositions({ positionName: 'BROKER' })

    const [agentUsers, brokerUsers] = await Promise.all([
        getAgentUsers(),
        getBrokerUsers()
    ])

    if(!agentUsers.success || !brokerUsers.success){
        return {
            success: false,
            data: [],
            error: agentUsers.error || brokerUsers.error
        }
    }

    // hands on brokers
    let handsOnDivisionMap = new Map<number, {DivisionID: number, DivisionName: string}[]>()
    const validHandsOnBrokers = agentUsers.data.filter((a: ITblAgentUser) => position.data[0].PositionID === (a.PositionID || 0))

    const brokerDivisions = await getDivisionBrokers({ agentIds: validHandsOnBrokers.map((agent: ITblAgentUser) => (agent.AgentID || 0)) })

    if(brokerDivisions.success){
        brokerDivisions.data.forEach((d: IBrokerDivision) => {
            const divisionInfo = { DivisionID: d.DivisionID, DivisionName: d.DivisionName }

            if(d.AgentID){
                const existing = handsOnDivisionMap.get(d.AgentID) || []
                handsOnDivisionMap.set(d.AgentID, [...existing, divisionInfo])
            }
        })
    }

    // hands off brokers
    let handsOffDivisionMap = new Map<number, {DivisionID: number, DivisionName: string}[]>()

    const handsOffDivisions = await getDivisionBrokers({ brokerIds: brokerUsers.data.map((broker: ITblBrokerUser) => (broker.BrokerID || 0)) })

    if(handsOffDivisions.success){
        handsOffDivisions.data.forEach((d: IBrokerDivision) => {
            const divisionInfo = { DivisionID: d.DivisionID, DivisionName: d.DivisionName }

            if(d.BrokerID){
                const existing = handsOffDivisionMap.get(d.BrokerID) || []
                handsOffDivisionMap.set(d.BrokerID, [...existing, divisionInfo])
            }
        })
    }

    console.log('handsOnDivisionMap', handsOnDivisionMap)
    console.log('handsOffDivisionMap', handsOffDivisionMap)

    const users: IMobileAccount[] = []

    agentUsers.data.map((user: ITblAgentUser) => {
        users.push({
            AgentUserID: user.AgentUserID,
            BrokerUserID: null,
            Email: user.Email,
            IsVerified: user.IsVerified,
            ImageID: user.ImageID,
            AgentID: user.AgentID,
            BrokerID: null,
            Position: user && user.Position ? user.Position.trim() : null,
            PositionID: user?.PositionID || null,
            Division: user && user.Division ? user.Division.trim() : null,
            DivisionID: user?.DivisionID ? Number(user.DivisionID) : null,
            AgentRegistrationID: user.AgentRegistrationID,
            BrokerRegistrationID: null,
            ...((position.data[0].PositionID == (user.PositionID || 0)) && { BrokerDivisions: handsOnDivisionMap.get(user.AgentID || 0) || [] })
        })
    })

    brokerUsers.data.map((user: ITblBrokerUser) => {
        users.push({
            AgentUserID: null,
            BrokerUserID: user.BrokerUserID,
            Email: user.Email,
            IsVerified: user.IsVerified,
            ImageID: user.ImageID,
            AgentID: null,
            BrokerID: user.BrokerID,
            Position: "BROKER",
            PositionID: position.data[0].PositionID || null,
            Division: null,
            DivisionID: null,
            AgentRegistrationID: null,
            BrokerRegistrationID: user.BrokerRegistrationID,
            BrokerDivisions: handsOffDivisionMap.get(user.BrokerID || 0) || []
        })
    })

    return {
        success: true,
        data: users
    }   
}

export const getInvitedEmailsService = async (userId: number): QueryResult<Partial<IInviteTokens>[]> => {
    const agent = await findAgentDetailsByUserId(userId)

    if(!agent.success){
        return {
            success: false,
            data: [],
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    if(!agent.data.AgentID){
        return {
            success: false,
            data: [],
            error: {
                message: 'No agent found',
                code: 400
            }
        }
    }

    const result = await findInviteTokenWithRegistration({ userId: agent.data.AgentID, showUsed: true, showExpired: true, })

    if(!result.success){
        return {
            success: false,
            data: [],
            error: result.error
        }
    }

    console.log(result.data.filter((invite: IInviteTokens & {IsVerified: number | null}) => invite.IsVerified && invite.IsVerified > 0))

    const obj: (IInviteTokens & {IsUMApproved: boolean, IsSAApproved: boolean, IsVerified: number | null, RejectedBy: string | null})[] = result.data.map((invite: IInviteTokens & {IsVerified: number | null}) => {
        let rejectedBy = null
        if(invite.IsVerified == -1){
            rejectedBy = 'UNIT MANAGER'
        }
        else if(invite.IsVerified == -2){
            rejectedBy = 'SALES ADMIN'
        }
        else {
            rejectedBy = null
        }

        return {
            AgentRegistration: invite.AgentRegistration,
            InviteTokenID: invite.InviteTokenID,
            InviteToken: invite.InviteToken,
            Email: invite.Email,
            LinkedUserID: invite.LinkedUserID,
            DivisionID: invite.DivisionID,
            IsActive: invite.IsActive,
            IsUsed: invite.IsUsed,
            IsVerified: invite.IsVerified,
            RejectedBy: rejectedBy,
            IsUMApproved: invite.IsVerified && invite.IsVerified > 0 ? true : false,
            IsSAApproved: invite.IsVerified && invite.IsVerified > 1 ? true : false,
            ExpiryDate: new TZDate(invite.ExpiryDate, 'Asia/Manila'),
            CreatedAt: new TZDate(invite.CreatedAt, 'Asia/Manila'),
            UpdatedAt: invite.UpdatedAt ? new TZDate(invite.UpdatedAt, 'Asia/Manila') : null
        }
    })

    return {
        success: true,
        data: obj
    }
}

export const getInviteRegistrationDetailsService = async (inviteToken: string): QueryResult<IInviteTokens & Partial<IAgentRegistration> & {RejectedBy: string | null}> => {
    const result = await findInviteToken({ inviteToken: inviteToken, showUsed: true, showExpired: true })

    if(!result.success || result.data.length === 0){
        return {
            success: false,
            data: {} as IInviteTokens & Partial<IAgentRegistration> & {RejectedBy: string | null},
            error: {
                message: 'Invite token not found',
                code: 400
            }
        }
    }

    const registration = await getAgentRegistrationWithoutUser({ agentRegistrationId: result.data[0].AgentRegistration || 0})
    console.log(registration)

    if(!registration.success || !registration.data){
        return {
            success: false,
            data: {} as IInviteTokens & Partial<IAgentRegistration> & {RejectedBy: string | null},
            error: {
                message: 'Agent registration not found',
                code: 400
            }
        }
    }

    let rejectedBy = null
    if(registration.data.IsVerified == -1){
        rejectedBy = 'UNIT MANAGER'
    }
    else if(registration.data.IsVerified == -2){
        rejectedBy = 'SALES ADMIN'
    }
    else {
        rejectedBy = null
    }

    return {
        success: true,
        data: {
            AgentRegistration: result.data[0].AgentRegistration || null,
            InviteTokenID: result.data[0].InviteTokenID,
            InviteToken: result.data[0].InviteToken,
            Email: result.data[0].Email,
            LinkedUserID: result.data[0].LinkedUserID,
            DivisionID: result.data[0].DivisionID,
            IsUsed: result.data[0].IsUsed,
            IsActive: result.data[0].IsActive,
            ExpiryDate: result.data[0].ExpiryDate,

            IsVerified: registration.data.IsVerified,
            RejectedBy: rejectedBy,

            FirstName: registration.data.FirstName,
            LastName: registration.data.LastName,
            MiddleName: registration.data.MiddleName,
            Address: registration.data.Address,
            Birthdate: registration.data.Birthdate,
            Gender: registration.data.Sex as "Male" | "Female" | undefined,

            CreatedAt: result.data[0].CreatedAt,
            UpdatedAt: result.data[0].UpdatedAt
        }

    }
}