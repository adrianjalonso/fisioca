import Menu from "../components/Menu";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import {
  dataDeHojeParaInput,
  formatarHoraDigitada,
  horaDentroDoExpediente,
  TIPOS_AGENDAMENTO,
} from "../lib/agendamentos";

interface Paciente {
  id: number;
  nome_paciente: string;
  id_user: number;
}

interface AgendamentoParaEdicao {
  id: number;
  paciente_id: number;
  data_hora: string;
  tipo: string;
  observacao: string;
}

const MENSAGEM_HORA_INVALIDA = "Informe um horário entre 07:00 e 21:59.";

export default function NovoAgendamento() {
  const { IdUser } = useUser();
  const navigate = useNavigate();
  const { id: idAgendamento } = useParams();
  const editando = Boolean(idAgendamento);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [tipo, setTipo] = useState("Atendimento");
  const [data, setData] = useState(dataDeHojeParaInput());
  const [hora, setHora] = useState("09:00");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [carregandoAgendamento, setCarregandoAgendamento] =
    useState(editando);
  const [horaTocada, setHoraTocada] = useState(false);

  const horaValida = horaDentroDoExpediente(hora);
  const erroHora = horaTocada && !horaValida ? MENSAGEM_HORA_INVALIDA : "";

  useEffect(() => {
  async function carregarPacientes() {
    if (!IdUser) return;

    try {
      const lista = await api<Paciente[]>("/pacientes");
      setPacientes(lista);
    } catch (e) {
      console.error("Erro ao carregar pacientes:", e);
      setErro("Não foi possível carregar os pacientes.");
    }
  }

  async function carregarAgendamento() {
    if (!IdUser || !idAgendamento) return;

    setCarregandoAgendamento(true);
    try {
      const agendamento = await api<AgendamentoParaEdicao>(
        `/agendamentos/${idAgendamento}`,
      );
      const [dataAgendamento, horaAgendamento] =
        agendamento.data_hora.split("T");

      setPacienteId(String(agendamento.paciente_id));
      setTipo(agendamento.tipo);
      setData(dataAgendamento ?? "");
      setHora(horaAgendamento?.substring(0, 5) ?? "09:00");
      setObservacao(agendamento.observacao ?? "");
    } catch (e) {
      console.error("Erro ao carregar o agendamento:", e);
      setErro("Não foi possível carregar o agendamento.");
    } finally {
      setCarregandoAgendamento(false);
    }
  }

  carregarPacientes();
  carregarAgendamento();
}, [IdUser, idAgendamento]);

  async function salvarAgendamento(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setErro("");

  if (!pacienteId || !data || !hora || !tipo) {
    setErro("Preencha todos os campos obrigatórios.");
    return;
  }

  setHoraTocada(true);
  if (!horaValida) {
    setErro(MENSAGEM_HORA_INVALIDA);
    return;
  }

  setSalvando(true);

  const corpo = JSON.stringify({
    paciente_id: Number(pacienteId),
    data_hora: `${data}T${hora}:00`,
    tipo,
    observacao: observacao.trim(),
  });

  try {
    if (editando) {
      await api(`/agendamentos/${idAgendamento}`, {
        method: "PATCH",
        body: corpo,
      });
    } else {
      await api("/agendamentos", {
        method: "POST",
        body: corpo,
      });
    }
    navigate(`/agenda?data=${data}`);
  } catch (e) {
    console.error("Erro ao salvar agendamento:", e);
    setErro(
      editando
        ? "Não foi possível salvar as alterações. Verifique os dados e tente novamente."
        : "Não foi possível salvar. Verifique os dados e tente novamente.",
    );
  } finally {
    setSalvando(false);
  }
}

  const campo =
    "w-full rounded-xl border-none bg-gray-50 px-4 py-3 text-sm text-gray-800 ring-1 ring-gray-200 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary";
  const rotulo = "text-sm font-medium text-gray-700";

  return (
    <div className="flex h-dvh flex-row overflow-hidden">
      <Menu />

      <main className="relative flex h-full flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-64 w-full bg-gradient-to-b from-emerald-100/60 to-transparent" />

        <div className="z-10 flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-28 lg:p-12 lg:pb-12">
          <div className="mx-auto flex max-w-4xl flex-col gap-8">
            {/* Breadcrumb */}
            <nav
              className="flex flex-wrap items-center gap-y-1 text-sm font-medium"
              aria-label="Você está em"
            >
              <Link
                to="/dashboard"
                className="text-gray-500 transition-colors hover:text-primary-dark"
              >
                Painel
              </Link>
              <span className="material-symbols-outlined mx-1 text-base text-gray-400">
                chevron_right
              </span>
              <Link
                to="/agenda"
                className="text-gray-500 transition-colors hover:text-primary-dark"
              >
                Agenda
              </Link>
              <span className="material-symbols-outlined mx-1 text-base text-gray-400">
                chevron_right
              </span>
              <span className="font-semibold">
                {editando ? "Editar agendamento" : "Novo agendamento"}
              </span>
            </nav>

            {/* Cabeçalho */}
            <header className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary-dark sm:h-14 sm:w-14">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">
                  {editando ? "edit_calendar" : "calendar_add_on"}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  {editando ? "Editar agendamento" : "Novo agendamento"}
                </h2>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">
                  {editando
                    ? "Corrija os dados deste agendamento e salve as alterações."
                    : "Preencha os dados para agendar um atendimento."}
                </p>
              </div>
            </header>

            {/* Formulário */}
            <form
              onSubmit={salvarAgendamento}
              aria-busy={carregandoAgendamento}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
                {erro && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100"
                  >
                    <span className="material-symbols-outlined text-xl">
                      error
                    </span>
                    {erro}
                  </div>
                )}

                {/* Paciente */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="paciente" className={rotulo}>
                    Paciente <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">
                      person
                    </span>
                    <select
                      id="paciente"
                      value={pacienteId}
                      onChange={(e) => setPacienteId(e.target.value)}
                      required
                      className={`${campo} appearance-none pl-11 pr-10`}
                    >
                      <option value="">Selecione um paciente</option>

                      {pacientes.map((paciente) => (
                        <option key={paciente.id} value={paciente.id}>
                          {paciente.nome_paciente}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      expand_more
                    </span>
                  </div>

                  {pacientes.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Nenhum paciente encontrado para sua conta.{" "}
                      <Link
                        to="/registro"
                        className="font-semibold text-primary-dark hover:underline"
                      >
                        Cadastrar paciente
                      </Link>
                    </p>
                  )}
                </div>

                {/* Tipo */}
                <div className="flex flex-col gap-2">
                  <span id="rotulo-tipo" className={rotulo}>
                    Tipo de atendimento <span className="text-red-500">*</span>
                  </span>

                  <div
                    role="radiogroup"
                    aria-labelledby="rotulo-tipo"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                  >
                    {TIPOS_AGENDAMENTO.map((opcao) => {
                      const selecionado = tipo === opcao.valor;

                      return (
                        <button
                          key={opcao.valor}
                          type="button"
                          role="radio"
                          aria-checked={selecionado}
                          onClick={() => setTipo(opcao.valor)}
                          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            selecionado
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              selecionado
                                ? "bg-primary text-white"
                                : "bg-primary/10 text-primary-dark"
                            }`}
                          >
                            <span className="material-symbols-outlined">
                              {opcao.icone}
                            </span>
                          </div>

                          <div className="flex-1">
                            <p className="font-bold text-gray-900">
                              {opcao.valor}
                            </p>
                            <p className="text-xs text-gray-500">
                              {opcao.descricao}
                            </p>
                          </div>

                          {selecionado && (
                            <span className="material-symbols-outlined text-primary-dark">
                              check_circle
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Data e horário */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="data" className={rotulo}>
                      Data <span className="text-red-500">*</span>
                    </label>

                    <input
                      id="data"
                      type="date"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      required
                      className={campo}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="hora" className={rotulo}>
                      Horário <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">
                        schedule
                      </span>
                      <input
                        id="hora"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={5}
                        placeholder="08:30"
                        value={hora}
                        onChange={(e) =>
                          setHora(formatarHoraDigitada(e.target.value))
                        }
                        onBlur={() => setHoraTocada(true)}
                        aria-invalid={Boolean(erroHora)}
                        aria-describedby={erroHora ? "erro-hora" : "ajuda-hora"}
                        required
                        className={`${campo} pl-11 tabular-nums ${
                          erroHora ? "ring-red-400 focus:ring-red-400" : ""
                        }`}
                      />
                    </div>
                    {erroHora ? (
                      <p
                        id="erro-hora"
                        role="alert"
                        className="text-xs font-medium text-red-500"
                      >
                        {erroHora}
                      </p>
                    ) : (
                      <p id="ajuda-hora" className="text-xs text-gray-400">
                        07:00 – 21:59
                      </p>
                    )}
                  </div>
                </div>

                {/* Observação */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="observacao" className={rotulo}>
                    Observação{" "}
                    <span className="font-normal text-gray-400">
                      (opcional)
                    </span>
                  </label>

                  <textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                    placeholder="Ex.: sessão para dor lombar..."
                    className={`${campo} resize-y`}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 md:px-8 md:py-5">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => navigate("/agenda")}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvando ||
                    carregandoAgendamento ||
                    pacientes.length === 0
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {salvando
                      ? "progress_activity"
                      : editando
                        ? "save"
                        : "calendar_check"}
                  </span>

                  {salvando
                    ? "Salvando..."
                    : editando
                      ? "Salvar alterações"
                      : "Salvar agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}