import { useState } from "react";
import { Link } from "react-router-dom";
import { requestForgotPassword } from "../services/auth.service";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;

    setErro("");
    setEnviando(true);

    try {
      await requestForgotPassword(email.trim());
      setEnviado(true);
    } catch {
      setErro("Não foi possível enviar o e-mail. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30";
  const rotulo = "text-sm font-medium text-gray-700";
  const iconeCampo =
    "material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary";

  return (
    <main className="flex min-h-dvh w-full">
      <section className="flex min-h-dvh w-full flex-col items-center justify-center bg-primary-light px-4 py-8 sm:px-6 sm:py-10 lg:w-3/5">
        <div className="flex w-full max-w-[480px] flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                <span className="material-symbols-outlined">ecg_heart</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Fisioca
              </h1>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Esqueceu a senha?
            </h2>
            <p className="text-base text-gray-600">
              Informe o e-mail da sua conta e enviaremos as instruções para você
              criar uma nova senha.
            </p>
          </div>

          <form onSubmit={enviar} className="flex w-full flex-col gap-5">
            {enviado && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary-dark ring-1 ring-primary/20"
              >
                <span className="material-symbols-outlined text-xl">
                  mark_email_read
                </span>
                <div>
                  Se o e-mail estiver cadastrado, você receberá as instruções
                  para redefinir sua senha. Confira também a caixa de spam.
                </div>
              </div>
            )}

            {erro && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100"
              >
                <span className="material-symbols-outlined text-xl">error</span>
                {erro}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={rotulo}>
                E-mail
              </label>
              <div className="relative">
                <span className={iconeCampo}>mail</span>
                <input
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErro("");
                  }}
                  required
                  autoComplete="email"
                  className={`${campo} pr-4`}
                  placeholder="seuemail@exemplo.com"
                  type="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? "Enviando..." : "Enviar instruções"}
              <span className="material-symbols-outlined">
                {enviando ? "progress_activity" : "send"}
              </span>
            </button>
          </form>

          <p className="flex justify-center text-sm text-gray-600">
            Lembrou da senha?
            <Link
              to="/login"
              className="mx-1.5 font-semibold text-primary-dark hover:underline"
            >
              Voltar para o login
            </Link>
          </p>
        </div>
      </section>

      <section className="sticky top-0 hidden min-h-dvh w-2/5 flex-col items-center justify-center overflow-hidden lg:flex">
        <img
          className="absolute inset-0 h-full w-full object-cover object-center"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIeJZZryymAKbtCjRZUiZng9G9Z2Uecwuyl5fNiqUHJTgDLf6tkbQbifHN7cmG8d0n0Ch60TTSilDFMvYnTftPcsI-BkByTKi6GJ8dZpgWk94j9FKShDk13sQomWfdXv73oAdLsBHw5BVn696BLwQ5rKIZPY-eLA-tlu_dv0pW5LVSAIsUNJ4TofpuCG1Wrvu3qtk8HEPnYgvBWQQI_d5g5SYM--IDhVGVKdMKMXPQq7hvsvcYOlXiLEMhWdGGM0wS-0TE0af781g"
          alt="Fisioterapeuta atendendo um paciente"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 z-20 p-12 text-white">
          <div className="max-w-lg">
            <h2 className="mb-4 text-4xl font-bold leading-tight">
              Transformando o cuidado ao paciente através de dados
            </h2>
            <p className="text-lg font-light text-white/90">
              Acesse análises de pacientes em tempo real e gerencie seus
              atendimentos com o Fisioca.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
