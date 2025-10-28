import { Request, Response } from "express"
import { get } from "http"
import { getAgentRegistrationsService, getAgentsService, lookupAgentDetailsService, lookupAgentRegistrationService } from "../service/agents.service"

export const getAgentsController = async (req: Request, res: Response) => {

    const { 
        showInactive,
        division
    } = req.params

    const result = await getAgentsService({showInactive: showInactive === 'true', division: Number(division)});

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agents.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agents.', data: result.data})

}

export const getAgentRegistrationsController = async (req: Request, res: Response) => {

    const result = await getAgentRegistrationsService();

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent registrations.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent registrations.', data: result.data})
}

export const getAgentDetailsController = async (req: Request, res: Response) => {
    const { agentId } = req.params;

    const result = await lookupAgentDetailsService(Number(agentId));

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent details.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent details.', data: result.data})
}

export const getAgentRegistrationController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentRegistrationId } = req.params

    const result = await lookupAgentRegistrationService(Number(session.userID), Number(agentRegistrationId));

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent details.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent registraton details.', data: result.data})
}