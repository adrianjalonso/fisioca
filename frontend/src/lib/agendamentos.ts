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

export const HORARIOS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]

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
