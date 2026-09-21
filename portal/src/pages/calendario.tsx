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
  Switch,
  EmptyState,
  SelectionBar,
  useToast,
  getStatusTone,
  type Column,
} from '@/components/arcadia';
import {
  getEventosCalendario,
  adicionarEventoCalendario,
  atualizarEventoCalendario,
  removerEventoCalendario,
  salvarEventosCalendario,
  getLembretes,
  adicionarLembrete,
  alternarLembrete,
  removerLembrete,
  subscribeToDataChanges,
} from '@/state/storage';
import type { EventoCalendario, Lembrete } from '@/mock-data';

export default function Calendario() {
  const { showToast } = useToast();

  const [itens, setItens] = useState<EventoCalendario[]>(getEventosCalendario);
  const [lembretes, setLembretes] = useState<Lembrete[]>(getLembretes);
  const [viewMode, setViewMode] = useState<string>('lista');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Tudo');
  const [busca, setBusca] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [modalLembretes, setModalLembretes] = useState(false);

  // Form Lembrete
  const [novoLembreteTitulo, setNovoLembreteTitulo] = useState('');
  const [novoLembreteData, setNovoLembreteData] = useState('14 set');
  const [novoLembreteHorario, setNovoLembreteHorario] = useState('08:00');
  const [novoLembreteTipo, setNovoLembreteTipo] = useState<'prazo' | 'evento'>('prazo');

  // Cronômetro regressivo em segundos (RF08)
  const [countdownSeconds, setCountdownSeconds] = useState(172800); // 2 dias = 172800s

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtros laterais
  const [filtroCategoria, setFiltroCategoria] = useState<Record<string, boolean>>({
    matricula: true,
    edital: true,
    evento: true,
    cancelamento: true,
    calendario: true,
  });

  // Modal form
  const [formTitulo, setFormTitulo] = useState('');
  const [formSubtitulo, setFormSubtitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState('Calendário');
  const [formData, setFormData] = useState('01 set');
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getEventosCalendario());
      setLembretes(getLembretes());
    });
    return unsubscribe;
  }, []);

  const categorias = [
    { label: 'Tudo' },
    { label: 'Calendário' },
    { label: 'Matrícula' },
    { label: 'Edital' },
    { label: 'Evento' },
    { label: 'Cancelamento' },
  ];

  const contagemCategorias = useMemo(() => {
    const map: Record<string, number> = { Tudo: itens.length };
    categorias.slice(1).forEach((c) => {
      map[c.label] = itens.filter(
        (e) => e.categoria.toLowerCase() === c.label.toLowerCase()
      ).length;
    });
    return categorias.map((c) => ({
      label: c.label,
      count: map[c.label],
    }));
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = [...itens];

    if (categoriaAtiva !== 'Tudo') {
      result = result.filter(
        (e) => e.categoria.toLowerCase() === categoriaAtiva.toLowerCase()
      );
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.subtitulo.toLowerCase().includes(q) ||
          e.data.toLowerCase().includes(q)
      );
    }

    result = result.filter((e) => filtroCategoria[e.categoria.toLowerCase()] ?? true);

    result.sort((a, b) => {
      return sortAsc
        ? a.data.localeCompare(b.data)
        : b.data.localeCompare(a.data);
    });

    return result;
  }, [itens, categoriaAtiva, busca, filtroCategoria, sortAsc]);

  const handleDelete = (evento: EventoCalendario) => {
    const backup = [...itens];
    removerEventoCalendario(evento.id);

    showToast({
      message: 'Evento excluído',
      action: {
        label: 'Desfazer',
        onClick: () => salvarEventosCalendario(backup),
      },
    });
  };

  const handleAbrirEdicao = (evento: EventoCalendario) => {
    setEditandoId(evento.id);
    setFormTitulo(evento.titulo);
    setFormSubtitulo(evento.subtitulo);
    setFormCategoria(evento.categoria ? evento.categoria.charAt(0).toUpperCase() + evento.categoria.slice(1).toLowerCase() : 'Calendário');
    setFormData(evento.data);
    setFormErro('');
    setModalEditar(true);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite um título para o evento');
      return;
    }
    if (!editandoId) return;

    atualizarEventoCalendario(editandoId, {
      titulo: formTitulo.trim(),
      subtitulo: formSubtitulo.trim() || 'Data acadêmica oficial',
      categoria: formCategoria.toLowerCase() as any,
      data: formData.trim() || '01 set',
    });

    setModalEditar(false);
    setEditandoId(null);
    showToast({ message: 'Evento atualizado com sucesso' });
  };

  const handleToggleLembreteEvento = (evento: EventoCalendario) => {
    const existente = lembretes.find((l) => l.eventoId === evento.id || l.titulo === evento.titulo);
    if (existente) {
      alternarLembrete(existente.id);
      showToast({ message: existente.ativo ? 'Lembrete desativado' : 'Lembrete ativado!' });
    } else {
      adicionarLembrete({
        eventoId: evento.id,
        titulo: evento.titulo,
        data: evento.data,
        horario: '08:00',
        ativo: true,
        tipo: 'evento',
        descricao: evento.subtitulo,
      });
      showToast({ message: `Lembrete criado para: ${evento.titulo}` });
    }
  };

  const handleCriarLembreteCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLembreteTitulo.trim()) return;
    adicionarLembrete({
      titulo: novoLembreteTitulo.trim(),
      data: novoLembreteData.trim(),
      horario: novoLembreteHorario.trim(),
      ativo: true,
      tipo: novoLembreteTipo,
      descricao: 'Lembrete pessoal configurado no portal',
    });
    setNovoLembreteTitulo('');
    showToast({ message: 'Novo lembrete salvo!' });
  };

  const dias = Math.floor(countdownSeconds / 86400);
  const horas = Math.floor((countdownSeconds % 86400) / 3600);
  const minutos = Math.floor((countdownSeconds % 3600) / 60);
  const segundos = countdownSeconds % 60;
  const tempoRestanteFormatado = `${dias}d ${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`;

  const proximoEvento = itens[0] || { titulo: 'Abertura da matrícula 2026/2', data: '14 set' };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite um título para o evento');
      return;
    }

    adicionarEventoCalendario({
      titulo: formTitulo.trim(),
      subtitulo: formSubtitulo.trim() || 'Data acadêmica oficial',
      categoria: formCategoria.toLowerCase() as any,
      data: formData.trim() || '01 set',
    });

    setModalNovo(false);
    setFormTitulo('');
    setFormSubtitulo('');
    setFormErro('');

    showToast({ message: 'Evento adicionado ao calendário' });
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0
      ? itens.filter((i) => selectedIds.includes(i.id))
      : filteredItens;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Título,Detalhes,Categoria,Data']
        .concat(
          list.map(
            (e) => `"${e.titulo}","${e.subtitulo}","${e.categoria}","${e.data}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'calendario.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelection = () => {
    const backup = [...itens];
    const remaining = itens.filter((i) => !selectedIds.includes(i.id));
    salvarEventosCalendario(remaining);
    setSelectedIds([]);

    showToast({
      message: `${selectedIds.length} eventos excluídos`,
      action: {
        label: 'Desfazer',
        onClick: () => salvarEventosCalendario(backup),
      },
    });
  };

  const columns: Column<EventoCalendario>[] = [
    {
      key: 'data',
      label: 'Data',
      kind: 'mono',
      width: 120,
      render: (e) => e.data,
    },
    {
      key: 'titulo',
      label: 'Evento',
      sortable: true,
      kind: 'strong',
      render: (e) => e.titulo,
    },
    {
      key: 'subtitulo',
      label: 'Detalhes',
      render: (e) => e.subtitulo,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      render: (e) => (
        <Badge tone={getStatusTone(e.categoria)}>
          {e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Ações',
      render: (e) => {
        const hasLembrete = lembretes.some((l) => (l.eventoId === e.id || l.titulo === e.titulo) && l.ativo);
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Button
              size="sm"
              variant={hasLembrete ? 'primary' : 'ghost'}
              onClick={(ev) => {
                ev.stopPropagation();
                handleToggleLembreteEvento(e);
              }}
            >
              {hasLembrete ? '🔔 Lembrete ativo' : '🔕 Ativar lembrete'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(ev) => {
                ev.stopPropagation();
                handleAbrirEdicao(e);
              }}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={(ev) => {
                ev.stopPropagation();
                handleDelete(e);
              }}
            >
              Excluir
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1. PageHero compacto */}
      <PageHero
        title="Calendário"
        count={itens.length}
        tone="cyan"
        description="Datas acadêmicas oficiais, feriados, recessos e períodos de matrícula do campus."
        actions={
          <>
            <Button
              variant="primary"
              iconRight="arrow-right"
              onClick={() => setModalNovo(true)}
            >
              Novo evento
            </Button>
            <Button variant="ghost" onClick={() => setModalLembretes(true)}>
              Lembretes & Cronômetro ({lembretes.filter((l) => l.ativo).length})
            </Button>
            <Button icon="download" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* Banner Cronômetro Regressivo (RF08) */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone="cyan">Próximo Prazo Acadêmico</Badge>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
            {proximoEvento ? proximoEvento.titulo : 'Abertura da matrícula 2026/2'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
            ({proximoEvento ? proximoEvento.data : '14 set'})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
            ⏳ {tempoRestanteFormatado}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setModalLembretes(true)}>
            Gerenciar Lembretes
          </Button>
        </div>
      </div>

      {/* 2. ChipBar com categorias */}
      <ChipBar
        items={contagemCategorias}
        value={categoriaAtiva}
        onChange={setCategoriaAtiva}
      />

      {/* 3. Duas colunas: FilterPanel e Conteúdo */}
      <div className="ar-split">
        <FilterPanel
          searchPlaceholder="Buscar data ou evento"
          searchValue={busca}
          onSearchChange={setBusca}
          groups={[
            {
              title: 'CATEGORIA',
              options: [
                { key: 'calendario', label: 'Calendário' },
                { key: 'matricula', label: 'Matrícula' },
                { key: 'edital', label: 'Edital' },
                { key: 'evento', label: 'Evento' },
                { key: 'cancelamento', label: 'Cancelamento' },
              ].map((c) => ({
                label: c.label,
                checked: filtroCategoria[c.key] ?? true,
                count: itens.filter((e) => e.categoria.toLowerCase() === c.key).length,
                onChange: (checked) =>
                  setFiltroCategoria((prev) => ({ ...prev, [c.key]: checked })),
              })),
            },
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <ViewToolbar
            view={viewMode}
            onViewChange={setViewMode}
            summary={`Mostrando todas as ${filteredItens.length} datas`}
          >
            <Button
              size="sm"
              icon="arrow-up-down"
              onClick={() => setSortAsc((v) => !v)}
            >
              {sortAsc ? 'Cronológico' : 'Inverso'}
            </Button>
          </ViewToolbar>

          {filteredItens.length === 0 ? (
            <EmptyState
              title="Nenhuma data encontrada"
              description="Tente alterar os termos da busca ou redefinir os filtros aplicados."
              actions={
                <Button
                  onClick={() => {
                    setCategoriaAtiva('Tudo');
                    setBusca('');
                    setFiltroCategoria({
                      matricula: true,
                      edital: true,
                      evento: true,
                      cancelamento: true,
                      calendario: true,
                    });
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'lista' ? (
            <div className="ar-card-grid">
              {filteredItens.map((e, index) => {
                const isFixado = index === 0 && categoriaAtiva === 'Tudo';
                const parts = e.data.trim().split(/\s+/);
                const day = parts[0] || '01';
                const month = parts[1] || 'set';

                return (
                  <RecordCard
                    key={e.id}
                    title={e.titulo}
                    description={e.subtitulo}
                    tags={[e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1)]}
                    badges={[
                      {
                        label: e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1),
                        tone: getStatusTone(e.categoria),
                      },
                    ]}
                    stamp={isFixado ? 'Fixado' : undefined}
                    tone={isFixado ? 'pink' : undefined}
                    meta={[
                      { label: 'Data', value: `${day} ${month}` },
                    ]}
                    signal={{
                      tone: 'muted',
                      label: `Agendado para ${e.data}`,
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12,
                alignItems: 'start',
              }}
            >
              {['Calendário', 'Matrícula', 'Evento'].map((cat) => {
                const colunaItens = filteredItens.filter(
                  (e) => e.categoria.toLowerCase() === cat.toLowerCase()
                );
                return (
                  <BoardColumn
                    key={cat}
                    title={cat}
                    tone={getStatusTone(cat)}
                    empty={`Nenhuma data em ${cat.toLowerCase()}`}
                  >
                    {colunaItens.map((e) => (
                      <BoardCard
                        key={e.id}
                        title={e.titulo}
                        meta={e.subtitulo}
                        badge={{
                          label: cat,
                          tone: getStatusTone(cat),
                        }}
                        footer={e.data}
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

      {/* Modal Novo Evento */}
      {modalNovo && (
        <Dialog
          title="Novo evento"
          eyebrow="CALENDÁRIO ACADÊMICO"
          description="Adicione uma data ou compromisso oficial ao calendário do campus."
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
              label="Nome do evento ou prazo"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Exemplo: Início do período letivo"
              autoFocus
            />

            <TextField
              label="Detalhes"
              value={formSubtitulo}
              onChange={(e) => setFormSubtitulo(e.target.value)}
              placeholder="Exemplo: Aulas inaugurais no auditório central"
            />

            <ChoiceChips
              label="Categoria"
              options={['Calendário', 'Matrícula', 'Edital', 'Evento', 'Cancelamento']}
              value={formCategoria}
              onChange={setFormCategoria}
            />

            <TextField
              label="Data de ocorrência"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              placeholder="Exemplo: 01 set"
            />
          </form>
        </Dialog>
      )}

      {/* Modal Editar Evento (Administrador - Gerenciar Eventos) */}
      {modalEditar && (
        <Dialog
          title="Editar evento acadêmico"
          eyebrow="CALENDÁRIO OFICIAL"
          description="Altere os dados da data oficial no calendário."
          onClose={() => setModalEditar(false)}
          footer={
            <>
              <Button variant="primary" onClick={handleSalvarEdicao}>
                Salvar alterações
              </Button>
              <Button variant="ghost" onClick={() => setModalEditar(false)}>
                Cancelar
              </Button>
            </>
          }
        >
          <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="Nome do evento ou prazo"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Nome do compromisso"
              autoFocus
            />

            <TextField
              label="Detalhes"
              value={formSubtitulo}
              onChange={(e) => setFormSubtitulo(e.target.value)}
              placeholder="Descrição do evento"
            />

            <ChoiceChips
              label="Categoria"
              options={['Calendário', 'Matrícula', 'Edital', 'Evento', 'Cancelamento']}
              value={formCategoria}
              onChange={setFormCategoria}
            />

            <TextField
              label="Data de ocorrência"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              placeholder="Exemplo: 01 set"
            />
          </form>
        </Dialog>
      )}

      {/* Modal Lembretes & Cronômetro (RF08 - Apresentar e Configurar Lembretes) */}
      {modalLembretes && (
        <Dialog
          title="Lembretes & Cronômetro Acadêmico"
          eyebrow="ORGANIZAÇÃO E PRAZOS (RF08)"
          description="Acompanhe a contagem regressiva para os próximos prazos acadêmicos e configure seus alertas."
          onClose={() => setModalLembretes(false)}
          footer={
            <Button variant="ghost" onClick={() => setModalLembretes(false)}>
              Fechar
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Bloco Cronômetro Regressivo */}
            <div
              style={{
                background: 'var(--canvas)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-secondary)' }}>
                  CRONÔMETRO DE CONTAGEM REGRESSIVA
                </span>
                <Badge tone="cyan">Tempo Real</Badge>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {proximoEvento.titulo}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 800,
                  color: 'var(--cyan-ink, #00d2ff)',
                  letterSpacing: '0.04em',
                }}
              >
                ⏱️ {tempoRestanteFormatado}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                Data do prazo oficial: {proximoEvento.data} às 08:00
              </span>
            </div>

            {/* Lista de Lembretes Configurados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Seus Lembretes Ativos ({lembretes.filter((l) => l.ativo).length})
              </div>
              {lembretes.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
                  Nenhum lembrete configurado no momento.
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lembretes.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                          {l.titulo}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                          📅 {l.data} {l.horario ? `às ${l.horario}` : ''} · {l.tipo === 'prazo' ? 'Prazo urgente' : 'Evento'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch
                          checked={l.ativo}
                          onChange={() => alternarLembrete(l.id)}
                          label={l.ativo ? 'Ativado' : 'Desativado'}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removerLembrete(l.id)}
                          title="Remover lembrete"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulário Novo Lembrete Personalizado */}
            <form onSubmit={handleCriarLembreteCustom} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Configurar Novo Lembrete
              </div>
              <TextField
                label="Título do lembrete"
                placeholder="Ex: Entregar relatório de estágio"
                value={novoLembreteTitulo}
                onChange={(e) => setNovoLembreteTitulo(e.target.value)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TextField
                  label="Data"
                  placeholder="Ex: 28 set"
                  value={novoLembreteData}
                  onChange={(e) => setNovoLembreteData(e.target.value)}
                />
                <TextField
                  label="Horário"
                  placeholder="Ex: 08:00"
                  value={novoLembreteHorario}
                  onChange={(e) => setNovoLembreteHorario(e.target.value)}
                />
              </div>
              <ChoiceChips
                label="Tipo de alerta"
                options={['prazo', 'evento']}
                value={novoLembreteTipo}
                onChange={(v) => setNovoLembreteTipo(v as any)}
              />
              <Button type="submit" variant="primary" size="sm" iconRight="arrow-right">
                Adicionar Lembrete
              </Button>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
