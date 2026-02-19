import { editAgentGovIds, editBrokerGovIds, findAgentDetailsByUserId, findBrokerDetailsByUserId } from "../../../repository/users.repository";
import { editAgentGovIdsService, editBrokerGovIdsService } from "../../../service/users.service";

jest.mock('../../../repository/users.repository');
jest.mock('../../../repository/agents.repository');

describe('Service Tests', () => {

    describe('editAgentGovIdsService', () => {
        it('rejects missing agent', async () => {
            (findAgentDetailsByUserId as jest.Mock).mockResolvedValue({
                success: false
            });
            
            (editAgentGovIds as jest.Mock).mockResolvedValue({
                success: true,
                data: [{ IdType: 'PRCNumber', IdNumber: '123' }]
            });

            const result = await editAgentGovIdsService(1, [{IdType: 'SSSNumber', IdNumber: 'SSS123456789'}]);
            
            expect(result.success).toBe(false);
        });

        it('edits gov ids', async () => {
            (findAgentDetailsByUserId as jest.Mock).mockResolvedValue({
                success: true,
                data: { AgentID: 1 }
            });
            
            (editAgentGovIds as jest.Mock).mockResolvedValue({
                success: true,
                data: [{ IdType: 'PRCNumber', IdNumber: '123' }]
            });

            const result = await editAgentGovIdsService(1, [{IdType: 'SSSNumber', IdNumber: 'SSS123456789'}]);
            
            expect(result.success).toBe(true);
            expect(findAgentDetailsByUserId).toHaveBeenCalledWith(1);
            expect(editAgentGovIds).toHaveBeenCalledWith(1, [{IdType: 'SSSNumber', IdNumber: 'SSS123456789'}]);
        });
    })

    describe('editBrokerGovIdsService', () => {
        it('rejects missing broker', async () => {
            (findBrokerDetailsByUserId as jest.Mock).mockResolvedValue({
                success: false
            });
            
            (editBrokerGovIds as jest.Mock).mockResolvedValue({
                success: true,
                data: [{ IdType: 'PRCNumber', IdNumber: '123' }]
            });

            const result = await editBrokerGovIdsService(1, [{IdType: 'SSSNumber', IdNumber: 'SSS123456789'}]);
            
            expect(result.success).toBe(false);
        });

        it('edits gov ids', async () => {
            (findBrokerDetailsByUserId as jest.Mock).mockResolvedValue({
                success: true,
                data: { BrokerID: 1 }
            });
            
            (editBrokerGovIds as jest.Mock).mockResolvedValue({
                success: true,
                data: [{ IdType: 'PRCNumber', IdNumber: '123' }]
            });

            const result = await editBrokerGovIdsService(1, [{IdType: 'SSSNumber', IdNumber: 'SSS123456789'}]);
            
            expect(result.success).toBe(true);
            expect(findBrokerDetailsByUserId).toHaveBeenCalledWith(1);
            expect(editBrokerGovIds).toHaveBeenCalledWith(1, [{IdType: 'SSSNumber', IdNumber: 'SSS123456789'}]);
        });
    })
  
});