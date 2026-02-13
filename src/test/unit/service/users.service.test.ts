import { editAgentGovIds, findAgentDetailsByUserId } from "../../../repository/users.repository";
import { editAgentGovIdsService } from "../../../service/users.service";

jest.mock('../../../repository/users.repository');
jest.mock('../../../repository/agents.repository');

describe('Service Tests', () => {

    describe('editAgentGovIdsService', () => {
        it('rejects missing agent', async () => {
            // Mock the repository - we already tested it works
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
            // Mock the repository - we already tested it works
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
        });
    })
  
});