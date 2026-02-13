import { editAgentGovIdsController, editBrokerGovIdsController } from "../../../controller/users.controller";
import { editAgentGovIdsService, editBrokerGovIdsService } from "../../../service/users.service";
import { Request, Response } from "express";

jest.mock('../../../service/users.service');

describe('Controller Tests', () => {
    describe('editAgentGovIdsController', () => {

        let req: Partial<Request>;
        let res: Partial<Response>;

        beforeEach(() => {
            req = {
                session: { userID: 1, sessionID: 1, userRole: '', isVerified: 1 },
                body: [{ IdType: 'PRCNumber', IdNumber: '123' }]
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
        });

        it('should return 401 if no session', async () => {

            req.session = undefined;

            const result = await editAgentGovIdsController(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401)
        })

        it('should return 401 if no user id', async () => {

            req.session = { } as any;

            const result = await editAgentGovIdsController(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401)
        })

        it('should return 200 if success', async () => {

            (editAgentGovIdsService as jest.Mock).mockResolvedValue({ success: true, data: [] });

            const result = await editAgentGovIdsController(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    describe('editBrokerGovIdsController', () => {

        let req: Partial<Request>;
        let res: Partial<Response>;

        beforeEach(() => {
            req = {
                session: { userID: 1, sessionID: 1, userRole: '', isVerified: 1 },
                body: [{ IdType: 'PRCNumber', IdNumber: '123' }]
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
        });

        it('should return 401 if no session', async () => {

            req.session = undefined;

            const result = await editBrokerGovIdsController(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401)
        })

        it('should return 401 if no user id', async () => {

            req.session = { } as any;

            const result = await editBrokerGovIdsController(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401)
        })

        it('should return 200 if success', async () => {

            (editBrokerGovIdsService as jest.Mock).mockResolvedValue({ success: true, data: [] });

            const result = await editBrokerGovIdsController(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200)
        })
    })
})