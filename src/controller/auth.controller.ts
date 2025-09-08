import { Request, Response } from "express";
import { IAgentRegister } from "../types/auth.types";
import { approveAgentRegistrationService, findEmailSendOTP, getCurrentAgentService, loginAgentService, logoutAgentSessionService, registerAgentService, verifyOTPService } from "../service/auth.service";

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

    res.cookie('_rcd_agent_cookie', result.data.token, {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

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

export const getCurrentAgentController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getCurrentAgentService(session.userID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to get current agent.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Current agent.", 
        data: result.data
    });
}

export const logoutAgentSessionController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await logoutAgentSessionService(session.sessionID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to logout agent session.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent session logged out successfully.", 
        data: result.data
    });
}

export const sendOTPController = async (req: Request, res: Response) => {

    const {
        email
    } = req.body

    const result = await findEmailSendOTP(email)

    return res.status(200).json({
        success: true, 
        message: "Check your email.", 
        data: result.data
    });
}

export const verifyOTPController = async (req: Request, res: Response) => {

    const {
        email,
        otp,
    } = req.body

    const result = await verifyOTPService(email, otp)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to verify otp.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "OTP verified successfully.", 
        data: result.data
    });

}