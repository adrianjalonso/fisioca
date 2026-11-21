import Menu from "../components/Menu";
import { Skeleton } from "../components/Skeleton";
import ModalAcoesAgendamento, {
  type AgendamentoModal,
} from "../components/ModalAcoesAgendamento";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import {
  dataAPartirDeChave,
  formatarChaveDia,
  HORA_INICIO,
  HORAS_LINHA_DO_TEMPO,
  horaDoAgendamento,
  minutosDoAgendamento,
  STATUS_AGENDADO,
  STATUS_CANCELADO,
} from "../lib/agendamentos";

interface Pacientes {
  id: number;
  nome_paciente: string;
  sobrenome_paciente: string;
  id_user: number;
}

interface Agendamentos {
  id: number;
  paciente_id: number;
  data_hora: string;
  data_fim: string;
  tipo: string;
  status: string;
  observacao: string;
  pacientes: Pacientes | null;
}

function nomeDoPaciente(a: Agendamentos) {
  return a.pacientes
    ? `${a.pacientes.nome_paciente}`
    : "Paciente desconhecido";
}

// 180px por hora = 15px a cada 5 minutos.
const ALTURA_HORA = 180;
const ALTURA_MINIMA_CARTAO = 45;

type AgendamentoComMinutos = {
  agendamento: Agendamentos;
  minutos: number;
  altura: number;
};

type AgendamentoPosicionado = {
  agendamento: Agendamentos;
  top: number;
  altura: number;
  coluna: number;
  colunas: number;
};

// Posiciona na linha do tempo contínua (07:00 no topo), dimensiona o cartão
// pela duração e reparte a largura entre cartões que se sobrepõem.
function posicionarNaLinhaDoTempo(agendamentos: Agendamentos[]) {
  const inicio = HORA_INICIO * 60;
  const fim = inicio + HORAS_LINHA_DO_TEMPO.length * 60;

  const itens = agendamentos
    .map((agendamento) => {
      const minutos = minutosDoAgendamento(agendamento.data_hora)
      const fimMinutos = minutosDoAgendamento(agendamento.data_fim)
      const termino = Math.min(fimMinutos ?? (minutos ?? inicio) + 60, fim)
      const duracao = minutos !== null ? Math.max(termino - minutos, 15) : 0

      return {
        agendamento,
        minutos,
        altura: Math.max((duracao / 60) * ALTURA_HORA, ALTURA_MINIMA_CARTAO),
      }
    })
    .filter(
      (item): item is AgendamentoComMinutos =>
        item.minutos !== null && item.minutos >= inicio && item.minutos < fim,
    )
    .sort((a, b) => a.minutos - b.minutos);

  const posicionados: AgendamentoPosicionado[] = [];
  let grupo: { agendamento: Agendamentos; top: number; bottom: number }[] = [];

  function fecharGrupo() {
    grupo.forEach((item, indice) => {
      posicionados.push({
        agendamento: item.agendamento,
        top: item.top,
        altura: item.bottom - item.top,
        coluna: indice,
        colunas: grupo.length,
      });
    });
    grupo = [];
  }

  for (const item of itens) {
    const top = ((item.minutos - inicio) / 60) * ALTURA_HORA;
    const bottom = top + item.altura;
    const ocupadoAte = grupo.length
      ? Math.max(...grupo.map((ocupante) => ocupante.bottom))
      : 0;

    if (grupo.length && top < ocupadoAte) {
      grupo.push({ agendamento: item.agendamento, top, bottom });
    } else {
      fecharGrupo();
      grupo = [{ agendamento: item.agendamento, top, bottom }];
    }
  }
  fecharGrupo();

  return posicionados;
}

export default function Agenda() {
  const hoje = new Date();

  const { IdUser } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agendamentos, setAgendamentos] = useState<Agendamentos[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(() =>
    dataAPartirDeChave(searchParams.get("data")),
  );
  const [carregandoAgenda, setCarregandoAgenda] = useState(true);
  const [erroAgenda, setErroAgenda] = useState("");
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<
    number | null
  >(() => {
    const param = Number(searchParams.get("agendamento"));
    return Number.isInteger(param) && param > 0 ? param : null;
  });

  const dataDePesquisa = formatarChaveDia(dataSelecionada);
  const ehHoje = dataDePesquisa === formatarChaveDia(hoje);
  const horaAtual = String(hoje.getHours()).padStart(2, "0");

  const agendamentosDoDia = agendamentos
    .filter((agendamento) => {
      const dataDoAgendamento = agendamento.data_hora.split("T")[0];
      return dataDoAgendamento === dataDePesquisa;
    })
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));

  const agendamentosPosicionados = posicionarNaLinhaDoTempo(agendamentosDoDia);

  useEffect(() => {
  if (!IdUser) return;

  async function carregarAgenda() {
    setCarregandoAgenda(true);
    setErroAgenda("");
    try {
      const data = await api<Agendamentos[]>("/agendamentos");

      const dadosFormatados = data.map((item) => ({
        ...item,
        pacientes: Array.isArray(item.pacientes)
          ? item.pacientes[0]
          : item.pacientes,
      }));

      setAgendamentos(dadosFormatados);
    } catch (e) {
      console.error("Erro ao carregar a agenda:", e);
      setErroAgenda("Não foi possível carregar a agenda.");
    } finally {
      setCarregandoAgenda(false);
    }
  }

  carregarAgenda();
}, [IdUser]);

  // Fecha o modal se o agendamento enviado por link não existir mais.
  useEffect(() => {
    if (agendamentoSelecionado === null || carregandoAgenda) return;
    if (!agendamentos.some((a) => a.id === agendamentoSelecionado)) {
      setAgendamentoSelecionado(null);
    }
  }, [agendamentos, agendamentoSelecionado, carregandoAgenda]);

  function atualizarParametros(chaveDia: string, idAgendamento?: number) {
    setSearchParams(
      (anteriores) => {
        const proximos = new URLSearchParams(anteriores);
        proximos.set("data", chaveDia);
        if (idAgendamento) {
          proximos.set("agendamento", String(idAgendamento));
        } else {
          proximos.delete("agendamento");
        }
        return proximos;
      },
      { replace: true },
    );
  }

  function mudarDia(delta: number) {
    const novaData = new Date(dataSelecionada);
    novaData.setDate(novaData.getDate() + delta);
    setDataSelecionada(novaData);
    setAgendamentoSelecionado(null);
    atualizarParametros(formatarChaveDia(novaData));
  }

  function abrirAgendamento(agendamento: Agendamentos) {
    setAgendamentoSelecionado(agendamento.id);
    atualizarParametros(dataDePesquisa, agendamento.id);
  }

  function fecharModal() {
    setAgendamentoSelecionado(null);
    atualizarParametros(dataDePesquisa);
  }

  async function cancelarAgendamento(agendamento: AgendamentoModal) {
    await api(`/agendamentos/${agendamento.id}/cancelar`, { method: "PATCH" });
    setAgendamentos((lista) =>
      lista.map((a) =>
        a.id === agendamento.id ? { ...a, status: STATUS_CANCELADO } : a,
      ),
    );
  }

  async function reativarAgendamento(agendamento: AgendamentoModal) {
    await api(`/agendamentos/${agendamento.id}/reativar`, { method: "PATCH" });
    setAgendamentos((lista) =>
      lista.map((a) =>
        a.id === agendamento.id ? { ...a, status: STATUS_AGENDADO } : a,
      ),
    );
  }

  async function excluirAgendamento(agendamento: AgendamentoModal) {
    await api(`/agendamentos/${agendamento.id}`, { method: "DELETE" });
    setAgendamentos((lista) => lista.filter((a) => a.id !== agendamento.id));
  }

  const agendamentoAberto =
    agendamentos.find((a) => a.id === agendamentoSelecionado) ?? null;

  const diaSemana = dataSelecionada.toLocaleDateString("pt-BR", {
    weekday: "long",
  });
  const diaSemanaCapitalizado =
    diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

  const botaoNavegar =
    "flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="flex h-dvh flex-row overflow-hidden">
      <Menu />

      <main className="relative flex h-full flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-64 w-full bg-gradient-to-b from-emerald-100/60 to-transparent"></div>

        <div className="z-10 flex-1 scroll-smooth overflow-y-auto p-4 pb-28 md:p-8 md:pb-28 lg:p-12 lg:pb-12">
          <div className="mx-auto flex max-w-7xl flex-col gap-8">
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
              <span className="font-semibold">Agenda</span>
            </nav>

            {erroAgenda && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100"
              >
                <span className="material-symbols-outlined text-xl">error</span>
                {erroAgenda}
              </div>
            )}

            {/* Cabeçalho */}
            <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Agenda
                </h2>
                <p className="max-w-xl text-gray-600">
                  Gerencie seus horários e atendimentos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
                  <button
                    aria-pressed="true"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  >
                    Dia
                  </button>
                  <button
                    disabled
                    title="Em breve"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    Semana
                  </button>
                  <button
                    disabled
                    title="Em breve"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    Mês
                  </button>
                </div>

                <Link
                  to={"/novoagendamento"}
                  className="flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dark hover:shadow-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 md:flex-none"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                  Novo agendamento
                </Link>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:h-[calc(100dvh-16rem)] lg:min-h-[520px] lg:grid-cols-12">
              {/* Linha do tempo do dia */}
              <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 lg:col-span-8 lg:min-h-0 xl:col-span-9">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 p-3 sm:p-4">
                  <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                    <button
                      aria-label="Dia anterior"
                      onClick={() => mudarDia(-1)}
                      className={botaoNavegar}
                    >
                      <span className="material-symbols-outlined">
                        chevron_left
                      </span>
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col text-center leading-tight">
                      <h3 className="truncate text-base font-bold sm:text-lg">
                        {dataSelecionada.toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </h3>
                      <p className="truncate text-xs text-gray-500 sm:text-sm">
                        {diaSemanaCapitalizado}
                      </p>
                    </div>

                    <button
                      aria-label="Próximo dia"
                      onClick={() => mudarDia(1)}
                      className={botaoNavegar}
                    >
                      <span className="material-symbols-outlined">
                        chevron_right
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const novoHoje = new Date(hoje);
                      setDataSelecionada(novoHoje);
                      setAgendamentoSelecionado(null);
                      atualizarParametros(formatarChaveDia(novoHoje));
                    }}
                    disabled={ehHoje}
                    className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary-dark transition-colors hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:bg-transparent disabled:text-gray-400 sm:px-4 sm:text-sm"
                  >
                    Hoje
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4" aria-busy={carregandoAgenda}>
                  {carregandoAgenda ? (
                    <div className="flex flex-col pt-4">
                      {HORAS_LINHA_DO_TEMPO.map((hora) => (
                        <div key={hora} className="flex border-t border-gray-100">
                          <div className="w-16 shrink-0 pt-3">
                            <Skeleton className="h-3 w-10" />
                          </div>
                          <div className="relative flex-1 border-l border-gray-100">
                            <div className="absolute left-2 right-2 top-6">
                              <Skeleton className="h-16 w-full rounded-xl" />
                            </div>
                            <div className="h-[180px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex border-t border-gray-100">
                      <div className="w-16 shrink-0">
                        {HORAS_LINHA_DO_TEMPO.map((hora) => {
                          const horaAgora =
                            ehHoje && hora.slice(0, 2) === horaAtual;

                          return (
                            <div
                              key={hora}
                              className={`flex h-[180px] pt-3 text-xs tabular-nums ${
                                horaAgora
                                  ? "font-bold text-primary-dark"
                                  : "font-medium text-gray-400"
                              }`}
                            >
                              {hora}
                            </div>
                          );
                        })}
                      </div>

                      <div className="relative flex-1 border-l border-gray-100">
                        {HORAS_LINHA_DO_TEMPO.map((hora) => (
                          <div
                            key={hora}
                            className={`relative h-[180px] border-b border-gray-100 ${
                              ehHoje && hora.slice(0, 2) === horaAtual
                                ? "bg-primary/5"
                                : ""
                            }`}
                          >
                            {[1, 2, 3].map((parte) => (
                              <div
                                key={parte}
                                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-gray-100"
                                style={{ top: `${parte * 45}px` }}
                              />
                            ))}
                          </div>
                        ))}

                        {agendamentosPosicionados.map(
                          ({ agendamento, top, altura, coluna, colunas }) => {
                            const isCancelado =
                              agendamento.status === STATUS_CANCELADO;
                            const inicioHora = horaDoAgendamento(
                              agendamento.data_hora,
                            );
                            const fimHora =
                              horaDoAgendamento(agendamento.data_fim) ||
                              inicioHora;
                            const periodo = `${inicioHora} – ${fimHora}`;

                            return (
                              <div
                                key={agendamento.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Ver ações do agendamento de ${nomeDoPaciente(agendamento)} das ${inicioHora} às ${fimHora}`}
                                onClick={() => abrirAgendamento(agendamento)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    abrirAgendamento(agendamento);
                                  }
                                }}
                                style={{
                                  top: `${top}px`,
                                  left: `calc(${(coluna / colunas) * 100}% + 4px)`,
                                  width: `calc(${100 / colunas}% - 8px)`,
                                  height: `${altura}px`,
                                }}
                                className={`absolute z-10 flex cursor-pointer flex-col justify-center gap-1 overflow-hidden rounded-xl border-l-4 px-3 py-2 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                  isCancelado
                                    ? "border-gray-300 bg-gray-100 opacity-60"
                                    : "border-primary bg-primary/10"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                                  <div className="flex min-w-0 items-baseline gap-2">
                                    <span
                                      className={`text-xs font-semibold tabular-nums ${
                                        isCancelado
                                          ? "text-gray-400"
                                          : "text-primary-dark"
                                      }`}
                                    >
                                      {periodo}
                                    </span>
                                    <span
                                      className={`truncate font-bold ${
                                        isCancelado
                                          ? "text-gray-400 line-through"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {nomeDoPaciente(agendamento)}
                                    </span>
                                  </div>

                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      isCancelado
                                        ? "bg-red-50 text-red-400"
                                        : "bg-white text-primary-dark ring-1 ring-primary/20"
                                    }`}
                                  >
                                    {agendamento.tipo}
                                  </span>
                                </div>

                                <span
                                  className={`truncate text-sm ${
                                    isCancelado
                                      ? "text-gray-400"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {agendamento.observacao || agendamento.status}
                                </span>
                              </div>
                            );
                          },
                        )}

                        {/* Espaço extra para cartões no fim da última hora. */}
                        <div className="h-[70px]" aria-hidden="true" />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Resumo do dia */}
              <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 lg:col-span-4 lg:min-h-0 xl:col-span-3">
                <div className="flex items-center justify-between border-b border-gray-100 p-4">
                  <div>
                    <h3 className="font-bold">Resumo do dia</h3>
                    {carregandoAgenda ? (
                      <Skeleton className="mt-1 h-4 w-28" />
                    ) : (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {agendamentosDoDia.length === 1
                          ? "1 agendamento"
                          : `${agendamentosDoDia.length} agendamentos`}
                      </p>
                    )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-dark">
                    <span className="material-symbols-outlined">
                      event_available
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-busy={carregandoAgenda}>
                  {carregandoAgenda ? (
                    [0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3"
                      >
                        <div className="flex min-w-[44px] flex-col items-center gap-2">
                          <Skeleton className="h-4 w-10" />
                          <Skeleton className="h-2 w-2 rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                      </div>
                    ))
                  ) : agendamentosDoDia.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <span className="material-symbols-outlined text-3xl text-gray-300">
                        event_busy
                      </span>
                      <p className="text-sm font-medium text-gray-600">
                        Dia livre
                      </p>
                      <p className="max-w-[200px] text-sm text-gray-400">
                        Nenhum agendamento para este dia.
                      </p>
                    </div>
                  ) : (
                    agendamentosDoDia.map((agendamento) => {
                      const isCancelado = agendamento.status === "Cancelado";

                      return (
                        <div
                          key={agendamento.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Ver ações do agendamento de ${nomeDoPaciente(agendamento)} às ${horaDoAgendamento(agendamento.data_hora)}`}
                          onClick={() => abrirAgendamento(agendamento)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              abrirAgendamento(agendamento);
                            }
                          }}
                          className={`flex cursor-pointer gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            isCancelado ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex min-w-[44px] flex-col items-center">
                            <span className="text-sm font-bold tabular-nums text-gray-700">
                              {horaDoAgendamento(agendamento.data_hora)}
                            </span>
                            <div
                              className={`mt-1.5 h-2 w-2 rounded-full ${
                                isCancelado ? "bg-gray-300" : "bg-primary"
                              }`}
                            ></div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4
                              className={`truncate text-sm font-bold ${
                                isCancelado
                                  ? "text-gray-400 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {nomeDoPaciente(agendamento)}
                            </h4>

                            <p className="truncate text-sm text-gray-500">
                              {agendamento.tipo}
                            </p>

                            <span
                              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                isCancelado
                                  ? "bg-red-50 text-red-400"
                                  : "bg-primary/10 text-primary-dark"
                              }`}
                            >
                              {agendamento.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <ModalAcoesAgendamento
        agendamento={agendamentoAberto}
        onClose={fecharModal}
        onEditar={(agendamento) =>
          navigate(`/editaragendamento/${agendamento.id}`)
        }
        onCancelar={cancelarAgendamento}
        onReativar={reativarAgendamento}
        onExcluir={excluirAgendamento}
      />
    </div>
  );
}