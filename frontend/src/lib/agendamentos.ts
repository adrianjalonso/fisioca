// Constantes e helpers compartilhados entre criação, edição e consulta da agenda.

export const TIPOS_AGENDAMENTO = [
  {
    valor: "Atendimento",
    descricao: "Sessão de fisioterapia",
    icone: "medical_services",
  },
  {
    valor: "Avaliação",
    descricao: "Avaliação inicial",
    icone: "assignment",
  },
] as const

export const HORA_INICIO = 7
export const HORA_FIM = 21
export const INTERVALO_MINUTOS = 5

// 07:00 às 21:00, de 5 em 5 minutos (169 opções).
export const HORARIOS = Array.from(
  { length: ((HORA_FIM - HORA_INICIO) * 60) / INTERVALO_MINUTOS + 1 },
  (_, i) => {
    const minutos = HORA_INICIO * 60 + i * INTERVALO_MINUTOS
    return `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`
  },
)

// Linhas da Agenda: uma por hora, da abertura ao fechamento.
export const HORAS_LINHA_DO_TEMPO = Array.from(
  { length: HORA_FIM - HORA_INICIO + 1 },
  (_, i) => `${pad(HORA_INICIO + i)}:00`,
)

export const STATUS_AGENDADO = "Agendado"
export const STATUS_CANCELADO = "Cancelado"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

// O input type="date" exige o formato AAAA-MM-DD (o mesmo de data_hora no banco).
export function formatarChaveDia(data: Date) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
}

export function dataDeHojeParaInput() {
  return formatarChaveDia(new Date())
}

export function dataAPartirDeChave(chave: string | null | undefined) {
  if (!chave || !/^\d{4}-\d{2}-\d{2}$/.test(chave)) return new Date()

  const [ano, mes, dia] = chave.split("-").map(Number)
  const data = new Date(ano, mes - 1, dia)
  return Number.isNaN(data.getTime()) ? new Date() : data
}

export function chaveDiaDoAgendamento(dataHora: string) {
  return dataHora.split("T")[0]
}

export function horaDoAgendamento(dataHora: string) {
  return dataHora.split("T")[1]?.substring(0, 5) ?? ""
}

// Minutos desde a meia-noite, usados para posicionar o cartão na linha do tempo.
export function minutosDoAgendamento(dataHora: string) {
  const [hora, minuto] = horaDoAgendamento(dataHora).split(":").map(Number)
  return Number.isFinite(hora) && Number.isFinite(minuto)
    ? hora * 60 + minuto
    : null
}
