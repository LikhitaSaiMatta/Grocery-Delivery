import express from "express";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";
import { assignDeliveryPartner, createDeliveryPartner, getAdminStatus, getDeliveryPartner, updateDeliveryPartner } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.get('/stats', auth, admin, getAdminStatus)
adminRouter.get('/delivery-partners', auth, admin, getDeliveryPartner)
adminRouter.post('/delivery-partners', auth, admin, createDeliveryPartner)
adminRouter.put('/delivery-partners/:id', auth, admin, updateDeliveryPartner)
adminRouter.put('/order/:id/assign', auth, admin, assignDeliveryPartner)

export default adminRouter