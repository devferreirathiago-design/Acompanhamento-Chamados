alter table chamados drop constraint if exists chamados_modal_logistico_check;

alter table chamados add constraint chamados_modal_logistico_check
  check (modal_logistico in (
    'Entrega Rápida',
    'Entregador de Loja',
    'Retirada em Loja',
    'Coleta agendada'
  ));
