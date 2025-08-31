import { Request, Response } from "express";
import { IAgentRegister } from "../types/auth.types";
import { approveAgentRegistrationService, loginAgentService, registerAgentService } from "../service/auth.service";

export const registerAgentController = async (req: Request, res: Response) => {

    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    console.log(profileImage)

    const {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience,
    } = req.body


    const obj: IAgentRegister = {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience
    }

    

    const result = await registerAgentService(obj, profileImage?.profileImage[0]);

    console.log(result)
    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to register agent.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registered successfully.",
        data: result.data
    })    
};

export const loginAgentController = async (req: Request, res: Response) => {
    const {
        email, 
        password
    } = req.body

    const result = await loginAgentService(email, password);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to login agent.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent logged in successfully.", 
        data: result.data
    });
}

export const approveAgentRegistrationController = async (req: Request, res: Response) => {

    const {
        agentRegistrationId,
        agentId
    } = req.body

    const result = await approveAgentRegistrationService(agentRegistrationId, agentId);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to approve agent registration.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registration approved successfully.", 
        data: result.data
    });
}