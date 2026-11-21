-- Registro de duração dos atendimentos (início em data_hora, fim em data_fim).
alter table public.agendamentos
  add column if not exists data_fim timestamp;

-- Agendamentos existentes passam a ter 1 hora de duração.
update public.agendamentos
   set data_fim = data_hora + interval '1 hour'
 where data_fim is null;

alter table public.agendamentos
  alter column data_fim set not null;
