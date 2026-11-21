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

// Campo HH:mm: aceita só dígitos e insere o ":" após as duas primeiras casas.
export function formatarHoraDigitada(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 4)
  return digitos.length <= 2 ? digitos : `${digitos.slice(0, 2)}:${digitos.slice(2)}`
}

// Validação do formulário: qualquer minuto entre 07:00 e 21:59.
export function horaDentroDoExpediente(valor: string) {
  const parte = /^(\d{2}):(\d{2})$/.exec(valor)
  if (!parte) return false

  const hora = Number(parte[1])
  const minuto = Number(parte[2])
  return (
    hora >= HORA_INICIO && hora <= HORA_FIM && minuto >= 0 && minuto <= 59
  )
}

function minutosDaHora(valor: string) {
  const parte = /^(\d{2}):(\d{2})$/.exec(valor)
  return parte ? Number(parte[1]) * 60 + Number(parte[2]) : null
}

// Padrão de 1 hora de atendimento, com teto em 21:59.
export function somaUmaHora(hora: string) {
  const atual = minutosDaHora(hora)
  if (atual === null) return ""

  const limite = HORA_FIM * 60 + 59
  const fim = Math.min(atual + 60, limite)
  return `${pad(Math.floor(fim / 60))}:${pad(fim % 60)}`
}

export function terminoDepoisDoInicio(inicio: string, fim: string) {
  const inicioMinutos = minutosDaHora(inicio)
  const fimMinutos = minutosDaHora(fim)
  return (
    inicioMinutos !== null &&
    fimMinutos !== null &&
    fimMinutos > inicioMinutos
  )
}

export function duracaoEmMinutos(inicio: string, fim: string) {
  const inicioMinutos = minutosDaHora(inicio)
  const fimMinutos = minutosDaHora(fim)
  return inicioMinutos !== null &&
    fimMinutos !== null &&
    fimMinutos > inicioMinutos
    ? fimMinutos - inicioMinutos
    : 0
}
