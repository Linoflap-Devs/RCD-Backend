import express from 'express';
import { validateEmployeeSession, validateMobileSession, validateSession } from '../middleware/auth';
import { getDivisionSalesController, getPersonalSalesController, getSalesTransactionDetailController, addPendingSaleController, editPendingSalesController, getPendingSalesController, getPendingSalesDetailsController, rejectPendingSalesController, approvePendingSalesController, getCombinedPersonalSalesController, approvePendingSalesSDController, approvePendingSalesBHController, getWebPendingSalesController, getWebPendingSalesDetailsController, editSaleImagesController, addWebPendingSaleController, rejectWebPendingSalesController, editPendingSalesControllerV2, editWebPendingSalesControllerV2, getWebSalesTransController, getWebSalesTransDtlController, editSalesTransactionController, getDivisionSalesTotalFnController, getDivisionSalesTotalsYearlyFnController, getSalesByDeveloperTotalsFnController, getSalesTargetsController } from '../controller/sales.controller';
import { validate } from '../middleware/zod';
import { addPendingSaleSchema } from '../schema/sales.schema';
import { validateRole } from '../middleware/roles';
import { multerUpload } from '../middleware/multer';

const router = express.Router();

router.route('/division').get([validateSession], getDivisionSalesController);
router.route('/personal').get([validateSession], getPersonalSalesController);

router.route('/targets').get([validateEmployeeSession], getSalesTargetsController);

router.route('/web/pending').get([validateEmployeeSession, validateRole(['AD','BH', 'SA'])], getWebPendingSalesController);
router.route('/web/pending').post(
    [
        validateEmployeeSession, 
        validateRole(['AD','BH', 'SA']),
        multerUpload.fields([{name: 'receipt', maxCount: 1}, {name: 'agreement', maxCount: 1}]),
        validate(addPendingSaleSchema),
    ], 
    addWebPendingSaleController
);
router.route('/web/pending/:pendingSalesId').get([validateEmployeeSession, validateRole(['AD','BH', 'SA'])], getWebPendingSalesDetailsController);
router.route('/pending').get([validateSession, validateRole(['AD','UM', 'SD'])], getPendingSalesController);
router.route('/pending/:pendingSalesId').get([validateMobileSession], getPendingSalesDetailsController);
router.route('/pending').post(
    [
        validateSession, 
        validateRole(['AD','SP', 'UM', 'SD']),
        multerUpload.fields([{name: 'receipt', maxCount: 1}, {name: 'agreement', maxCount: 1}]),
        validate(addPendingSaleSchema),
    ], 
    addPendingSaleController
);
router.route('/pending/:pendingSalesId').patch([validateSession, validateRole(['UM'])], editPendingSalesController);
router.route('/pending/:pendingSalesId/images').patch(
    [
        validateSession,
        validateRole(['SP']),
        multerUpload.fields([{name: 'receipt', maxCount: 1}, {name: 'agreement', maxCount: 1}]),
    ],
    editSaleImagesController
)

router.route('/pending/edit/:pendingSalesId').patch(
    [
        validateSession, 
        validateRole(['SP', 'UM', 'SD']),
        multerUpload.fields([{name: 'receipt', maxCount: 1}, {name: 'agreement', maxCount: 1}]),
    ], 
    editPendingSalesControllerV2
);

router.route('/pending/web/edit/:pendingSalesId').patch(
    [
        validateEmployeeSession, 
        validateRole(['AD','BH', 'SA']),
        multerUpload.fields([{name: 'receipt', maxCount: 1}, {name: 'agreement', maxCount: 1}]),
    ], 
    editWebPendingSalesControllerV2
);

router.route('/pending/reject/:pendingSalesId').patch([validateSession, validateRole(['UM', 'SD'])], rejectPendingSalesController);
router.route('/pending/web/reject/:pendingSalesId').patch([validateEmployeeSession, validateRole(['AD','BH', 'SA'])], rejectWebPendingSalesController);
router.route('/pending/approve/:pendingSalesId').patch([validateSession, validateRole(['SD'])], approvePendingSalesSDController);

router.route('/pending/approve/bh/:pendingSalesId').patch([validateEmployeeSession, validateRole(['AD','BH'])], approvePendingSalesBHController);
router.route('/pending/approve/sa/:pendingSalesId').patch([validateEmployeeSession, validateRole(['AD','SA'])], approvePendingSalesController);

router.route('/combined').get([validateMobileSession], getCombinedPersonalSalesController);

router.route('/:salesTransactionId').get([validateMobileSession], getSalesTransactionDetailController);



router.route('/web/division/').get([validateEmployeeSession], getDivisionSalesTotalFnController)
router.route('/web/division/yearly/').get([validateEmployeeSession], getDivisionSalesTotalsYearlyFnController)
router.route('/web/developers/').get([validateEmployeeSession], getSalesByDeveloperTotalsFnController)
router.route('/web/:salesTransactionId').get([validateEmployeeSession, validateRole(['AD','BH', 'SA', 'AL', 'ML'])], getWebSalesTransDtlController);
router.route('/web/:salesTransactionId').patch(
    [
        validateEmployeeSession, 
        validateRole(['SA']),
        multerUpload.fields([{name: 'receipt', maxCount: 1}, {name: 'agreement', maxCount: 1}]),
    ], 
    editSalesTransactionController
);


router.route('/').get([validateEmployeeSession, validateRole(['AD','BH', 'SA', 'AL', 'ML'])], getWebSalesTransController);

export default router;