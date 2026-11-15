const CHAVES_SESSAO = ["token", "titulo", "nome", "email", "IdUser"];

export function limparSessao() {
  CHAVES_SESSAO.forEach((chave) => localStorage.removeItem(chave));
}

export function logout() {
  limparSessao();
  window.location.href = "/login";
}
