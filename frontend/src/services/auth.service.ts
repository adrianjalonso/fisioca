import api from "../api/api";
import { api as request } from "../lib/api";

export type Perfil = {
  user_id: number;
  user_nome: string;
  user_email: string;
  titulo: string | null;
  crefito: string | null;
};

export type DadosPerfil = {
  nome: string;
  titulo: string;
  email: string;
  crefito: string;
};

export async function register(userData:{
  nome: string,
  email: string,
  password: string,
  titulo:string,
  termosVersao: string
}) {
  const response = await fetch(`${api}/auth/register`,{
    method: "POST",
    headers:{
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userData),
  })
  const data = await response.json()

  if(!response.ok){
    throw new Error(data.message);
  }

  return data;
}

export function getProfile() {
  return request<Perfil>("/auth/perfil");
}

export function updateProfile(userData: DadosPerfil) {
  return request<Perfil>("/auth/perfil", {
    method: "PATCH",
    body: JSON.stringify(userData),
  });
}

export function requestForgotPassword(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, novaSenha: string) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, novaSenha }),
  });
}

export function changePassword(
  senhaAtual: string,
  novaSenha: string
) {
  return request<{ message: string; token: string; expiresAt: number }>("/auth/alterar-senha", {
    method: "PATCH",
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}
