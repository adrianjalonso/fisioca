import { useEffect, useRef, useState } from "react"
import { horaDoAgendamento } from "../lib/agendamentos"

export type AgendamentoModal = {
  id: number
  data_hora: string
  tipo: string
  status: string
  observacao: string
  pacientes: { nome_paciente?: string | null } | null
}

type Props = {
  agendamento: AgendamentoModal | null
  onClose: () => void
  onEditar: (agendamento: AgendamentoModal) => void
  onCancelar: (agendamento: AgendamentoModal) => Promise<void>
  onReativar: (agendamento: AgendamentoModal) => Promise<void>
  onExcluir: (agendamento: AgendamentoModal) => Promise<void>
}

type Acao = "cancelar" | "reativar" | "excluir"

export default function ModalAcoesAgendamento({
  agendamento,
  onClose,
  onEditar,
  onCancelar,
  onReativar,
  onExcluir,
}: Props) {
  const [confirmacao, setConfirmacao] = useState<"cancelar" | "excluir" | null>(
    null
  )
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState("")

  const fecharRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const processandoRef = useRef(processando)
  onCloseRef.current = onClose
  processandoRef.current = processando

  const aberto = agendamento !== null

  // Ao abrir: foca no botão de fechar, trava a rolagem e fecha com Esc.
  useEffect(() => {
    if (!aberto) return

    setConfirmacao(null)
    setErro("")
    setProcessando(false)

    const elementoAnterior = document.activeElement as HTMLElement | null
    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = "hidden"
    fecharRef.current?.focus()

    function aoPressionar(e: KeyboardEvent) {
      if (e.key === "Escape" && !processandoRef.current) onCloseRef.current()
    }

    window.addEventListener("keydown", aoPressionar)

    return () => {
      window.removeEventListener("keydown", aoPressionar)
      document.body.style.overflow = overflowOriginal
      elementoAnterior?.focus()
    }
  }, [aberto, agendamento?.id])

  if (!agendamento) return null

  const cancelado = agendamento.status === "Cancelado"
  const nomePaciente =
    agendamento.pacientes?.nome_paciente || "Paciente desconhecido"

  const dataFormatada = new Date(agendamento.data_hora).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric" }
  )

  async function executar(acao: Acao) {
    if (!agendamento || processando) return

    setProcessando(true)
    setErro("")

    try {
      if (acao === "cancelar") await onCancelar(agendamento)
      else if (acao === "reativar") await onReativar(agendamento)
      else await onExcluir(agendamento)
      onClose()
    } catch (e) {
      console.error("Erro ao atualizar agendamento:", e)
      setErro(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível concluir a ação. Tente novamente."
      )
    } finally {
      setProcessando(false)
    }
  }

  const botaoAcao =
    "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !processando) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agendamento-acoes-titulo"
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="agendamento-acoes-titulo"
              className="text-lg font-bold tracking-tight text-gray-900"
            >
              Detalhes do agendamento
            </h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {dataFormatada} às {horaDoAgendamento(agendamento.data_hora)}
            </p>
          </div>

          <button
            ref={fecharRef}
            type="button"
            aria-label="Fechar detalhes"
            disabled={processando}
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {erro && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100"
            >
              <span className="material-symbols-outlined text-xl">error</span>
              {erro}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4">
            <div>
              <p className="text-xs font-medium text-gray-400">Paciente</p>
              <p className="font-bold text-gray-900">{nomePaciente}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-primary-dark ring-1 ring-primary/20">
                {agendamento.tipo}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  cancelado
                    ? "bg-red-50 text-red-500"
                    : "bg-primary/10 text-primary-dark"
                }`}
              >
                {agendamento.status}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400">Observação</p>
              <p className="text-sm text-gray-600">
                {agendamento.observacao || "Sem observação"}
              </p>
            </div>
          </div>

          {confirmacao && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {confirmacao === "cancelar"
                  ? "Cancelar este agendamento?"
                  : "Excluir este agendamento?"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                {confirmacao === "cancelar"
                  ? "O agendamento continua no histórico, mas deixa de contar como ativo. Você pode reativá-lo depois."
                  : "O agendamento será removido definitivamente. Se houver uma evolução registrada, a exclusão será bloqueada."}
              </p>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={processando}
                  onClick={() => setConfirmacao(null)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={processando}
                  onClick={() => executar(confirmacao)}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {processando
                    ? "Processando..."
                    : confirmacao === "cancelar"
                      ? "Confirmar cancelamento"
                      : "Excluir agendamento"}
                </button>
              </div>
            </div>
          )}
        </div>

        {!confirmacao && (
          <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
            <button
              type="button"
              disabled={processando}
              onClick={() => onEditar(agendamento)}
              className={`${botaoAcao} bg-primary text-white shadow-sm hover:bg-primary-dark`}
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Editar agendamento
            </button>

            {cancelado ? (
              <button
                type="button"
                disabled={processando}
                onClick={() => executar("reativar")}
                className={`${botaoAcao} bg-blue-50 text-blue-700 hover:bg-blue-100`}
              >
                <span className="material-symbols-outlined text-lg">
                  restart_alt
                </span>
                Reativar agendamento
              </button>
            ) : (
              <button
                type="button"
                disabled={processando}
                onClick={() => setConfirmacao("cancelar")}
                className={`${botaoAcao} border border-gray-200 bg-white text-gray-700 hover:bg-gray-100`}
              >
                <span className="material-symbols-outlined text-lg">
                  event_busy
                </span>
                Cancelar agendamento
              </button>
            )}

            <button
              type="button"
              disabled={processando}
              onClick={() => setConfirmacao("excluir")}
              className={`${botaoAcao} border border-red-100 bg-white text-red-600 hover:bg-red-50`}
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Excluir agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
