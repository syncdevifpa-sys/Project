import React, { useState, useMemo, useEffect } from 'react';
import {
  PageHero,
  ChipBar,
  FilterPanel,
  ViewToolbar,
  RecordCard,
  DataTable,
  BoardColumn,
  BoardCard,
  Button,
  Badge,
  Dialog,
  TextField,
  ChoiceChips,
  EmptyState,
  SelectionBar,
  useToast,
  getStatusTone,
  type Column,
} from '@/components/arcadia';
import {
  getTarefas,
  adicionarTarefa,
  removerTarefa,
  salvarTarefas,
  alternarSituacaoTarefa,
  subscribeToDataChanges,
} from '@/state/storage';
import type { Tarefa } from '@/mock-data';

export default function Tarefas() {
  const { showToast } = useToast();

  const [itens, setItens] = useState<Tarefa[]>(getTarefas);
  const [viewMode, setViewMode] = useState<string>('quadro');
  const [situacaoAtiva, setSituacaoAtiva] = useState('Tudo');
  const [busca, setBusca] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalNovo, setModalNovo] = useState(false);

  // Filtros laterais
  const [filtroSituacao, setFiltroSituacao] = useState<Record<string, boolean>>({
    Aberta: true,
    'Em andamento': true,
    Aguardando: true,
    Concluída: true,
  });

  // Modal form
  const [formTitulo, setFormTitulo] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('Eu');
  const [formPrazo, setFormPrazo] = useState('12 set');
  const [formSituacao, setFormSituacao] = useState<'Aberta' | 'Em andamento' | 'Aguardando' | 'Concluída'>('Aberta');
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getTarefas());
    });
    return unsubscribe;
  }, []);

  const situacoesLista = ['Tudo', 'Aberta', 'Em andamento', 'Aguardando', 'Concluída'];

  const contagemSituacoes = useMemo(() => {
    const map: Record<string, number> = { Tudo: itens.length };
    situacoesLista.slice(1).forEach((s) => {
      map[s] = itens.filter(
        (t) => t.situacao.toLowerCase() === s.toLowerCase()
      ).length;
    });
    return situacoesLista.map((s) => ({
      label: s,
      count: map[s],
    }));
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = [...itens];

    if (situacaoAtiva !== 'Tudo') {
      result = result.filter(
        (t) => t.situacao.toLowerCase() === situacaoAtiva.toLowerCase()
      );
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (t) =>
          t.titulo.toLowerCase().includes(q) ||
          t.responsavel.toLowerCase().includes(q)
      );
    }

    result = result.filter((t) => filtroSituacao[t.situacao] ?? true);

    result.sort((a, b) => {
      return sortAsc
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });

    return result;
  }, [itens, situacaoAtiva, busca, filtroSituacao, sortAsc]);

  const handleDelete = (tarefa: Tarefa) => {
    const backup = [...itens];
    removerTarefa(tarefa.id);

    showToast({
      message: 'Tarefa excluída',
      action: {
        label: 'Desfazer',
        onClick: () => salvarTarefas(backup),
      },
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite um título para a tarefa');
      return;
    }

    adicionarTarefa({
      titulo: formTitulo.trim(),
      responsavel: formResponsavel.trim() || 'Eu',
      prazo: formPrazo.trim() || 'Sem prazo',
      situacao: formSituacao,
    });

    setModalNovo(false);
    setFormTitulo('');
    setFormErro('');

    showToast({ message: 'Tarefa criada com sucesso' });
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0
      ? itens.filter((i) => selectedIds.includes(i.id))
      : filteredItens;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Título,Responsável,Prazo,Situação']
        .concat(
          list.map(
            (t) => `"${t.titulo}","${t.responsavel}","${t.prazo}","${t.situacao}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'tarefas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelection = () => {
    const backup = [...itens];
    const remaining = itens.filter((i) => !selectedIds.includes(i.id));
    salvarTarefas(remaining);
    setSelectedIds([]);

    showToast({
      message: `${selectedIds.length} tarefas excluídas`,
      action: {
        label: 'Desfazer',
        onClick: () => salvarTarefas(backup),
      },
    });
  };

  const columns: Column<Tarefa>[] = [
    {
      key: 'titulo',
      label: 'Tarefa',
      sortable: true,
      kind: 'strong',
      render: (t) => t.titulo,
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      render: (t) => t.responsavel,
    },
    {
      key: 'prazo',
      label: 'Prazo',
      kind: 'mono',
      render: (t) => t.prazo,
    },
    {
      key: 'situacao',
      label: 'Situação',
      render: (t) => (
        <Badge tone={getStatusTone(t.situacao)}>{t.situacao}</Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1. PageHero compacto */}
      <PageHero
        title="Tarefas"
        count={itens.length}
        tone="cyan"
        description="Acompanhe seus prazos acadêmicos e atividades pendentes. A próxima vence em 12 set."
        actions={
          <>
            <Button
              variant="primary"
              iconRight="arrow-right"
              onClick={() => setModalNovo(true)}
            >
              Nova tarefa
            </Button>
            <Button icon="download" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* 2. ChipBar com situações */}
      <ChipBar
        items={contagemSituacoes}
        value={situacaoAtiva}
        onChange={setSituacaoAtiva}
      />

      {/* 3. Duas colunas: FilterPanel e Conteúdo */}
      <div className="ar-split">
        <FilterPanel
          searchPlaceholder="Buscar tarefa"
          searchValue={busca}
          onSearchChange={setBusca}
          groups={[
            {
              title: 'SITUAÇÃO',
              options: ['Aberta', 'Em andamento', 'Aguardando', 'Concluída'].map((s) => ({
                label: s,
                checked: filtroSituacao[s] ?? true,
                count: itens.filter((t) => t.situacao === s).length,
                onChange: (checked) =>
                  setFiltroSituacao((prev) => ({ ...prev, [s]: checked })),
              })),
            },
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <ViewToolbar
            view={viewMode}
            onViewChange={setViewMode}
            summary={`Mostrando todas as ${filteredItens.length}`}
          >
            <Button
              size="sm"
              icon="arrow-up-down"
              onClick={() => setSortAsc((v) => !v)}
            >
              {sortAsc ? 'A a Z' : 'Z a A'}
            </Button>
          </ViewToolbar>

          {filteredItens.length === 0 ? (
            <EmptyState
              title="Nenhuma tarefa encontrada"
              description="Tente alterar os termos da busca ou redefinir os filtros aplicados."
              actions={
                <Button
                  onClick={() => {
                    setSituacaoAtiva('Tudo');
                    setBusca('');
                    setFiltroSituacao({
                      Aberta: true,
                      'Em andamento': true,
                      Aguardando: true,
                      Concluída: true,
                    });
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'lista' ? (
            <div className="ar-card-grid">
              {filteredItens.map((t, index) => {
                const isFixado = index === 0 && situacaoAtiva === 'Tudo';
                const isUrgente = t.prazo.includes('12 set') || t.situacao === 'Aberta';

                return (
                  <RecordCard
                    key={t.id}
                    title={t.titulo}
                    tags={[t.responsavel]}
                    badges={[
                      {
                        label: t.situacao,
                        tone: getStatusTone(t.situacao),
                      },
                    ]}
                    flag={isUrgente ? 'Urgente' : undefined}
                    stamp={isFixado ? 'Fixado' : undefined}
                    tone={isFixado ? 'pink' : undefined}
                    meta={[
                      { label: 'Prazo', value: t.prazo },
                      { label: 'Responsável', value: t.responsavel },
                    ]}
                    signal={{
                      tone: isUrgente ? 'orange' : 'muted',
                      label: `Vence em ${t.prazo}`,
                    }}
                  />
                );
              })}
            </div>
          ) : viewMode === 'tabela' ? (
            <DataTable
              columns={columns}
              rows={filteredItens}
              selectable
              selected={selectedIds}
              onSelectAll={() => {
                if (selectedIds.length === filteredItens.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(filteredItens.map((i) => i.id));
                }
              }}
              onToggleSelect={(id) => {
                const sId = String(id);
                setSelectedIds((prev) =>
                  prev.includes(sId)
                    ? prev.filter((x) => x !== sId)
                    : [...prev, sId]
                );
              }}
              onRemove={handleDelete}
            />
          ) : (
            /* Visualização Quadro */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 12,
                alignItems: 'start',
              }}
            >
              {(['Aberta', 'Em andamento', 'Aguardando', 'Concluída'] as const).map((sit) => {
                const colunaItens = filteredItens.filter((t) => t.situacao === sit);
                return (
                  <BoardColumn
                    key={sit}
                    title={sit}
                    tone={getStatusTone(sit)}
                    empty={`Nenhuma tarefa ${sit.toLowerCase()}`}
                  >
                    {colunaItens.map((t) => (
                      <BoardCard
                        key={t.id}
                        title={t.titulo}
                        meta={t.responsavel}
                        badge={{
                          label: t.situacao,
                          tone: getStatusTone(t.situacao),
                        }}
                        footer={t.prazo}
                        action={
                          t.situacao !== 'Concluída'
                            ? {
                                label: 'Avançar',
                                onClick: (e) => {
                                  e.stopPropagation();
                                  alternarSituacaoTarefa(t.id);
                                  showToast({ message: 'Tarefa avançada' });
                                },
                              }
                            : undefined
                        }
                        onClick={() => {
                          alternarSituacaoTarefa(t.id);
                          showToast({ message: 'Situação da tarefa alterada' });
                        }}
                      />
                    ))}
                  </BoardColumn>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SelectionBar
        count={selectedIds.length}
        actions={[
          {
            label: 'Exportar seleção',
            onClick: handleExportCSV,
          },
          {
            label: 'Excluir',
            danger: true,
            onClick: handleDeleteSelection,
          },
        ]}
        onClear={() => setSelectedIds([])}
      />

      {/* Modal Nova Tarefa */}
      {modalNovo && (
        <Dialog
          title="Nova tarefa"
          eyebrow="ATIVIDADES ACADÊMICAS"
          description="Cadastre uma atividade com data de entrega para acompanhar em Tarefas."
          onClose={() => setModalNovo(false)}
          footer={
            <>
              <Button variant="primary" onClick={handleCreate}>
                Criar registro
              </Button>
              <Button variant="ghost" onClick={() => setModalNovo(false)}>
                Cancelar
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="Título da tarefa"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Exemplo: Enviar relatório do estágio"
              autoFocus
            />

            <ChoiceChips
              label="Situação inicial"
              options={['Aberta', 'Em andamento', 'Aguardando', 'Concluída']}
              value={formSituacao}
              onChange={(v) => setFormSituacao(v as any)}
            />

            <TextField
              label="Responsável"
              value={formResponsavel}
              onChange={(e) => setFormResponsavel(e.target.value)}
              placeholder="Exemplo: Eu"
            />

            <TextField
              label="Prazo"
              value={formPrazo}
              onChange={(e) => setFormPrazo(e.target.value)}
              placeholder="Exemplo: 12 set"
            />
          </form>
        </Dialog>
      )}
    </div>
  );
}
