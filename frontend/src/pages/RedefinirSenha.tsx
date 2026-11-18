import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/auth.service";

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [visible, setVisible] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando) return;

    setErro("");

    if (!token) {
      setErro("Link inválido. Solicite uma nova recuperação de senha.");
      return;
    }

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setSalvando(true);

    try {
      await resetPassword(token, senha);
      navigate("/login", {
        replace: true,
        state: { senhaRedefinida: true },
      });
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível redefinir a senha. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  const campo =
    "h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30";
  const rotulo = "text-sm font-medium text-gray-700";
  const iconeCampo =
    "material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary";
  const botaoOlho =
    "absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors hover:text-gray-700 focus:outline-none focus-visible:text-primary-dark";

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
              Crie uma nova senha
            </h2>
            <p className="text-base text-gray-600">
              Escolha uma senha com pelo menos 8 caracteres para acessar sua
              conta.
            </p>
          </div>

          <form onSubmit={salvar} className="flex w-full flex-col gap-5">
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
              <label htmlFor="nova-senha" className={rotulo}>
                Nova senha
              </label>
              <div className="relative">
                <span className={iconeCampo}>lock</span>
                <input
                  id="nova-senha"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setErro("");
                  }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`${campo} pr-11`}
                  placeholder="••••••••"
                  type={visible ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  className={botaoOlho}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {visible ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmar-senha" className={rotulo}>
                Confirmar nova senha
              </label>
              <div className="relative">
                <span className={iconeCampo}>lock_reset</span>
                <input
                  id="confirmar-senha"
                  value={confirmacao}
                  onChange={(e) => {
                    setConfirmacao(e.target.value);
                    setErro("");
                  }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`${campo} pr-4`}
                  placeholder="••••••••"
                  type={visible ? "text" : "password"}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando || !token}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Redefinir senha"}
              <span className="material-symbols-outlined">
                {salvando ? "progress_activity" : "lock_reset"}
              </span>
            </button>
          </form>

          <p className="flex justify-center text-sm text-gray-600">
            Precisa de um novo link?
            <Link
              to="/esqueci-senha"
              className="mx-1.5 font-semibold text-primary-dark hover:underline"
            >
              Solicitar recuperação
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
