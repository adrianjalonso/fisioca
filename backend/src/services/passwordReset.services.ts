import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { createSupabaseAuthClient, supabase } from "../database/supabase.js";
import { mailer } from "../config/mailer.js";

const RESET_TOKEN_TTL_MINUTES = 30;
const SENHA_MIN_LENGTH = 8;

const MENSAGEM_GENERICA =
  "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function urlFrontend() {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

export async function forgotPasswordService(email: string) {
  const emailNormalizado = String(email ?? "").trim().toLowerCase();

  if (!emailNormalizado) {
    return { message: MENSAGEM_GENERICA };
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("user_id, user_email")
    .eq("user_email", emailNormalizado)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar usuário no forgot-password:", error.message);
    return { message: MENSAGEM_GENERICA };
  }

  // Mesmo sem usuário, responde igual para não revelar quais e-mails existem.
  if (!user) {
    return { message: MENSAGEM_GENERICA };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  // Um único token válido por usuário por vez.
  const { error: deleteError } = await supabase
    .from("password_resets")
    .delete()
    .eq("user_id_recovery", user.user_id);

  if (deleteError) {
    console.error("Erro ao limpar tokens antigos:", deleteError.message);
  }

  const { error: insertError } = await supabase
    .from("password_resets")
    .insert({
      user_id_recovery: user.user_id,
      token_hash: hashToken(token),
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("Erro ao salvar token de recuperação:", insertError.message);
    return { message: MENSAGEM_GENERICA };
  }

  const link = `${urlFrontend()}/redefinir-senha?token=${token}`;

  try {
    await mailer.sendMail({
      from: `"Fisioca" <${process.env.SMTP_USER}>`,
      to: user.user_email,
      subject: "Redefinição de senha - Fisioca",
      text:
        `Recebemos um pedido para redefinir a senha da sua conta Fisioca.\n\n` +
        `Acesse o link abaixo (válido por ${RESET_TOKEN_TTL_MINUTES} minutos):\n${link}\n\n` +
        `Se você não fez esse pedido, ignore este e-mail.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
          <h2>Redefinição de senha</h2>
          <p>Recebemos um pedido para redefinir a senha da sua conta Fisioca.</p>
          <p>
            <a href="${link}" style="display:inline-block;padding:12px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
              Redefinir minha senha
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280;">
            Este link é válido por ${RESET_TOKEN_TTL_MINUTES} minutos e pode ser usado uma única vez.<br />
            Se o botão não funcionar, copie e cole este endereço no navegador:<br />
            <span style="word-break:break-all;">${link}</span>
          </p>
          <p style="font-size:13px;color:#6b7280;">Se você não fez esse pedido, ignore este e-mail.</p>
        </div>
      `,
    });
  } catch (mailError) {
    console.error("Erro ao enviar e-mail de recuperação:", mailError);
  }

  return { message: MENSAGEM_GENERICA };
}

export async function resetPasswordService(token: string, novaSenha: string) {
  if (!token) {
    throw new Error("Token inválido ou expirado");
  }

  const senha = String(novaSenha ?? "");
  if (senha.length < SENHA_MIN_LENGTH) {
    throw new Error(`A senha deve ter pelo menos ${SENHA_MIN_LENGTH} caracteres`);
  }

  const { data: reset, error: resetError } = await supabase
    .from("password_resets")
    .select("id, user_id_recovery, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (resetError) {
    throw new Error(resetError.message);
  }

  if (
    !reset ||
    reset.used_at ||
    new Date(reset.expires_at).getTime() < Date.now()
  ) {
    throw new Error("Token inválido ou expirado");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("user_id, auth_id")
    .eq("user_id", reset.user_id_recovery)
    .maybeSingle();

  if (userError || !user) {
    throw new Error("Usuário não encontrado");
  }

  if (!user.auth_id) {
    throw new Error("Não foi possível redefinir a senha deste usuário");
  }

  // A senha de login realmente usada vive no Supabase Auth.
  const { error: authError } = await supabase.auth.admin.updateUserById(
    user.auth_id,
    { password: senha }
  );

  if (authError) {
    throw new Error(authError.message);
  }

  // Mantém a coluna do perfil coerente com o Auth.
  const senhaHash = await bcrypt.hash(senha, 10);
  const { error: updateError } = await supabase
    .from("users")
    .update({ senha: senhaHash })
    .eq("user_id", user.user_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: usedError } = await supabase
    .from("password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("id", reset.id);

  if (usedError) {
    throw new Error(usedError.message);
  }

  return { message: "Senha redefinida com sucesso" };
}

export async function changePasswordService(
  userId: number,
  authId: string,
  senhaAtual: string,
  novaSenha: string
) {
  const atual = String(senhaAtual ?? "");
  const senha = String(novaSenha ?? "");

  if (!atual) {
    throw new Error("Informe a senha atual");
  }

  if (senha.length < SENHA_MIN_LENGTH) {
    throw new Error(
      `A nova senha deve ter pelo menos ${SENHA_MIN_LENGTH} caracteres`
    );
  }

  // Usa o e-mail que está no Auth, e não o do perfil, para validar a senha atual.
  const { data: authUser, error: authUserError } =
    await supabase.auth.admin.getUserById(authId);

  if (authUserError || !authUser.user?.email) {
    throw new Error("Usuário do Auth não encontrado");
  }

  const { error: signInError } = await createSupabaseAuthClient().auth.signInWithPassword({
    email: authUser.user.email,
    password: atual,
  });

  if (signInError) {
    throw new Error("Senha atual incorreta");
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(
    authId,
    { password: senha }
  );

  if (authError) {
    throw new Error(authError.message);
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const { error: updateError } = await supabase
    .from("users")
    .update({ senha: senhaHash })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // O Supabase revoga o JWT antigo quando a senha muda. Geramos um novo
  // para que a sessão continue ativa sem exigir um novo login.
  const { data: novaSessao, error: sessaoError } =
    await createSupabaseAuthClient().auth.signInWithPassword({
      email: authUser.user.email!,
      password: senha,
    });

  if (sessaoError || !novaSessao.session) {
    throw new Error(
      "Senha alterada, mas não foi possível renovar a sessão. Faça login novamente."
    );
  }

  return {
    message: "Senha alterada com sucesso",
    token: novaSessao.session.access_token,
    expiresAt: novaSessao.session.expires_at,
  };
}
