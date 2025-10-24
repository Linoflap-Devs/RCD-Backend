import { Request, Response } from "express"
import { get } from "http"
import { getAgentRegistrationsService, getAgentsService, lookupAgentDetailsService } from "../service/agents.service"

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