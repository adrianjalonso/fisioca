import { Request, Response, NextFunction } from "express";
import { supabase } from "../database/supabase.js";

export async function autenticar(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Não autenticado",
    });
  }

  try {
    const token = header.slice(7);

    // 1. Validar o token diretamente com o Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Token inválido ou expirado",
      });
    }

    // 2. Encontrar o perfil correspondente ao UUID autenticado
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_id", authData.user.id)
      .maybeSingle();

    if (userError || !user) {
      return res.status(401).json({
        error: "Perfil não encontrado",
      });
    }

    // 3. Manter compatibilidade com suas rotas existentes
    (req as any).userId = user.user_id;
    (req as any).authId = authData.user.id;

    next();
  } catch {
    return res.status(401).json({
      error: "Falha na autenticação",
    });
  }
}