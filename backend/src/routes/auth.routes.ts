import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  alterarSenha,
} from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";

const router = Router()

router.post("/register", register)
router.post("/login", login)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/perfil", autenticar, getProfile)
router.patch("/perfil", autenticar, updateProfile)
router.patch("/alterar-senha", autenticar, alterarSenha)

export default router
