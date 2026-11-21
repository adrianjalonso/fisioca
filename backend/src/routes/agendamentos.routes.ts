import { Router } from "express"
import { supabase } from "../database/supabase.js"
import { autenticar } from "../middlewares/auth.middleware.js"

const router = Router()
router.use(autenticar)

const TIPOS = ["Atendimento", "Avaliação"]
const STATUS_AGENDADO = "Agendado"
const STATUS_CANCELADO = "Cancelado"
const FORMATO_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/

function idValido(v: string) {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

function dataHoraValida(v: unknown) {
  return (
    typeof v === "string" &&
    FORMATO_DATA_HORA.test(v) &&
    !Number.isNaN(new Date(v).getTime())
  )
}

function agendamentoDoUsuario(id: number, userId: number) {
  return supabase
    .from("agendamentos")
    .select("id, paciente_id, data_hora, tipo, status, observacao, pacientes!inner(id, id_user)")
    .eq("id", id)
    .eq("pacientes.id_user", userId)
    .maybeSingle()
}

function pacienteDoUsuario(id: number, userId: number) {
  return supabase
    .from("pacientes")
    .select("id")
    .eq("id", id)
    .eq("id_user", userId)
    .maybeSingle()
}

// Agenda: todos os agendamentos dos pacientes do usuário logado
router.get("/", async (req, res) => {
  const userId = (req as any).userId

  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      "id, paciente_id, data_hora, tipo, status, observacao, pacientes!inner(id, nome_paciente, id_user)"
    )
    .eq("pacientes.id_user", userId)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Atendimentos já realizados e sem evolução registrada
router.get("/pendentes-evolucao", async (req, res) => {
  const userId = (req as any).userId
  const agora = String(req.query.agora ?? "")

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(agora)) {
    return res.status(400).json({ error: "Parâmetro 'agora' inválido" })
  }

  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      `id, data_hora, tipo, status, observacao, evolucoes ( id ),
       pacientes!inner ( id, nome_paciente, id_user )`
    )
    .eq("pacientes.id_user", userId)
    .lte("data_hora", agora)
    .order("data_hora", { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  // Considera concluído todo atendimento cujo horário já passou,
  // exceto os cancelados e os que já têm evolução registrada.
  const pendentes = (data ?? []).filter(
    (a: any) =>
      a.status !== STATUS_CANCELADO &&
      (!a.evolucoes || a.evolucoes.length === 0)
  )
  res.json(pendentes)
})

// Atendimentos passados de um paciente que ainda não têm evolução
router.get("/sem-evolucao", async (req, res) => {
  const userId = (req as any).userId
  const pacienteId = Number(req.query.paciente_id)
  const agora = String(req.query.agora ?? "")

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    return res.status(400).json({ error: "Paciente inválido" })
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(agora)) {
    return res.status(400).json({ error: "Parâmetro 'agora' inválido" })
  }

  const { data: paciente, error: erroPaciente } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("id_user", userId)
    .maybeSingle()

  if (erroPaciente) return res.status(500).json({ error: erroPaciente.message })
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" })

  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, data_hora, tipo, status, evolucoes(id)")
    .eq("paciente_id", paciente.id)
    .lte("data_hora", agora)
    .order("data_hora", { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const semEvolucao = (data ?? []).filter(
    (a: any) =>
      a.status !== STATUS_CANCELADO &&
      (!a.evolucoes || a.evolucoes.length === 0)
  )
  res.json(semEvolucao)
})

router.post("/", async (req, res) => {
  const userId = (req as any).userId
  const { paciente_id, data_hora, tipo, observacao } = req.body
  const pacienteId = Number(paciente_id)

  if (
    !Number.isInteger(pacienteId) ||
    pacienteId <= 0 ||
    !dataHoraValida(data_hora) ||
    !TIPOS.includes(tipo)
  ) {
    return res.status(400).json({ error: "Dados inválidos" })
  }

  const { data: paciente, error: erroPaciente } = await pacienteDoUsuario(
    pacienteId,
    userId
  )

  if (erroPaciente) return res.status(500).json({ error: erroPaciente.message })
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" })

  const { data, error } = await supabase
    .from("agendamentos")
    .insert({
      paciente_id: paciente.id,
      data_hora,
      tipo,
      status: STATUS_AGENDADO,
      observacao: String(observacao ?? "").trim(),
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Um agendamento específico (usado pelo formulário de edição)
router.get("/:id", async (req, res) => {
  const userId = (req as any).userId
  const id = idValido(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  const { data, error } = await agendamentoDoUsuario(id, userId)
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: "Agendamento não encontrado" })

  res.json(data)
})

// Editar data/hora, tipo, paciente e observação.
// Editar um agendamento cancelado o reativa automaticamente.
router.patch("/:id", async (req, res) => {
  const userId = (req as any).userId
  const id = idValido(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  const { data: atual, error: erroAtual } = await agendamentoDoUsuario(id, userId)
  if (erroAtual) return res.status(500).json({ error: erroAtual.message })
  if (!atual) return res.status(404).json({ error: "Agendamento não encontrado" })

  const { paciente_id, data_hora, tipo, observacao } = req.body
  const pacienteId = Number(paciente_id)

  if (
    !Number.isInteger(pacienteId) ||
    pacienteId <= 0 ||
    !dataHoraValida(data_hora) ||
    !TIPOS.includes(tipo)
  ) {
    return res.status(400).json({ error: "Dados inválidos" })
  }

  const { data: paciente, error: erroPaciente } = await pacienteDoUsuario(
    pacienteId,
    userId
  )
  if (erroPaciente) return res.status(500).json({ error: erroPaciente.message })
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" })

  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      paciente_id: paciente.id,
      data_hora,
      tipo,
      status: STATUS_AGENDADO,
      observacao: String(observacao ?? "").trim(),
    })
    .eq("id", id)
    .select("id, paciente_id, data_hora, tipo, status, observacao")
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Cancelamento lógico: mantém o registro para histórico/prontuário.
router.patch("/:id/cancelar", async (req, res) => {
  const userId = (req as any).userId
  const id = idValido(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  const { data: atual, error: erroAtual } = await agendamentoDoUsuario(id, userId)
  if (erroAtual) return res.status(500).json({ error: erroAtual.message })
  if (!atual) return res.status(404).json({ error: "Agendamento não encontrado" })

  if (atual.status === STATUS_CANCELADO) return res.json(atual)

  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: STATUS_CANCELADO })
    .eq("id", id)
    .select("id, status")
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Desfaz um cancelamento sem precisar editar os demais campos.
router.patch("/:id/reativar", async (req, res) => {
  const userId = (req as any).userId
  const id = idValido(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  const { data: atual, error: erroAtual } = await agendamentoDoUsuario(id, userId)
  if (erroAtual) return res.status(500).json({ error: erroAtual.message })
  if (!atual) return res.status(404).json({ error: "Agendamento não encontrado" })

  if (atual.status === STATUS_AGENDADO) return res.json(atual)

  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: STATUS_AGENDADO })
    .eq("id", id)
    .select("id, status")
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Exclusão definitiva. Não permite apagar um atendimento que já tem evolução.
router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId
  const id = idValido(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  const { data: atual, error: erroAtual } = await agendamentoDoUsuario(id, userId)
  if (erroAtual) return res.status(500).json({ error: erroAtual.message })
  if (!atual) return res.status(404).json({ error: "Agendamento não encontrado" })

  const { count, error: erroEvolucoes } = await supabase
    .from("evolucoes")
    .select("id", { count: "exact", head: true })
    .eq("id_agendamento", id)
    .limit(1)

  if (erroEvolucoes) return res.status(500).json({ error: erroEvolucoes.message })
  if (count && count > 0) {
    return res.status(409).json({
      error: "Este agendamento possui uma evolução registrada e não pode ser excluído.",
    })
  }

  const { data, error } = await supabase
    .from("agendamentos")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: "Agendamento não encontrado" })

  res.json({ ok: true })
})

export default router
