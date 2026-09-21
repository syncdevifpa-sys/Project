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
  getProjetos,
  adicionarProjeto,
  removerProjeto,
  salvarProjetos,
  subscribeToDataChanges,
} from '@/state/storage';
import type { Projeto } from '@/mock-data';

export default function Projetos() {
  const { showToast } = useToast();

  const [itens, setItens] = useState<Projeto[]>(getProjetos);
  const [viewMode, setViewMode] = useState<string>('lista');
  const [eixoAtivo, setEixoAtivo] = useState('Tudo');
  const [busca, setBusca] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalNovo, setModalNovo] = useState(false);

  // Filtros laterais
  const [filtroSituacao, setFiltroSituacao] = useState<Record<string, boolean>>({
    Inscrições: true,
    'Em seleção': true,
    Ativo: true,
    Concluído: true,
  });

  // Modal form
  const [formTitulo, setFormTitulo] = useState('');
  const [formAutor, setFormAutor] = useState('Prof. Marcos Tavares');
  const [formEixo, setFormEixo] = useState<'Pesquisa' | 'Ensino' | 'Extensão' | 'Inovação'>('Pesquisa');
  const [formVagas, setFormVagas] = useState('4');
  const [formSituacao, setFormSituacao] = useState<'Inscrições' | 'Em seleção' | 'Ativo' | 'Concluído'>('Inscrições');
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getProjetos());
    });
    return unsubscribe;
  }, []);

  const eixosLista = ['Tudo', 'Pesquisa', 'Ensino', 'Extensão', 'Inovação'];

  const contagemEixos = useMemo(() => {
    const map: Record<string, number> = { Tudo: itens.length };
    eixosLista.slice(1).forEach((e) => {
      map[e] = itens.filter(
        (p) => p.eixo.toLowerCase() === e.toLowerCase()
      ).length;
    });
    return eixosLista.map((e) => ({
      label: e,
      count: map[e],
    }));
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = [...itens];

    if (eixoAtivo !== 'Tudo') {
      result = result.filter(
        (p) => p.eixo.toLowerCase() === eixoAtivo.toLowerCase()
      );
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.autor.toLowerCase().includes(q) ||
          p.eixo.toLowerCase().includes(q)
      );
    }

    result = result.filter((p) => filtroSituacao[p.situacao] ?? true);

    result.sort((a, b) => {
      return sortAsc
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });

    return result;
  }, [itens, eixoAtivo, busca, filtroSituacao, sortAsc]);

  const handleDelete = (projeto: Projeto) => {
    const backup = [...itens];
    removerProjeto(projeto.id);

    showToast({
      message: 'Projeto excluído',
      action: {
        label: 'Desfazer',
        onClick: () => salvarProjetos(backup),
      },
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite o título do projeto');
      return;
    }

    adicionarProjeto({
      titulo: formTitulo.trim(),
      autor: formAutor.trim() || 'Docente responsável',
      eixo: formEixo,
      vagas: parseInt(formVagas, 10) || 1,
      situacao: formSituacao,
    });

    setModalNovo(false);
    setFormTitulo('');
    setFormErro('');

    showToast({ message: 'Projeto submetido com sucesso' });
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0
      ? itens.filter((i) => selectedIds.includes(i.id))
      : filteredItens;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Título,Coordenador,Eixo,Vagas,Situação']
        .concat(
          list.map(
            (p) =>
              `"${p.titulo}","${p.autor}","${p.eixo}",${p.vagas},"${p.situacao}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'projetos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelection = () => {
    const backup = [...itens];
    const remaining = itens.filter((i) => !selectedIds.includes(i.id));
    salvarProjetos(remaining);
    setSelectedIds([]);

    showToast({
      message: `${selectedIds.length} projetos excluídos`,
      action: {
        label: 'Desfazer',
        onClick: () => salvarProjetos(backup),
      },
    });
  };

  const columns: Column<Projeto>[] = [
    {
      key: 'titulo',
      label: 'Projeto',
      sortable: true,
      kind: 'strong',
      render: (p) => p.titulo,
    },
    {
      key: 'autor',
      label: 'Coordenador',
      render: (p) => p.autor,
    },
    {
      key: 'eixo',
      label: 'Eixo',
      render: (p) => (
        <Badge tone={getStatusTone(p.eixo)}>{p.eixo}</Badge>
      ),
    },
    {
      key: 'vagas',
      label: 'Vagas',
      kind: 'mono',
      render: (p) => `${p.vagas} ${p.vagas === 1 ? 'vaga' : 'vagas'}`,
    },
    {
      key: 'situacao',
      label: 'Situação',
      render: (p) => (
        <Badge tone={getStatusTone(p.situacao)}>{p.situacao}</Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1. PageHero compacto */}
      <PageHero
        title="Projetos"
        count={itens.length}
        tone="cyan"
        description="Iniciativas de pesquisa aplicada, extensão comunitária e desenvolvimento acadêmico no campus."
        actions={
          <>
            <Button
              variant="primary"
              iconRight="arrow-right"
              onClick={() => setModalNovo(true)}
            >
              Novo projeto
            </Button>
            <Button icon="download" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* 2. ChipBar com eixos */}
      <ChipBar
        items={contagemEixos}
        value={eixoAtivo}
        onChange={setEixoAtivo}
      />

      {/* 3. Duas colunas: FilterPanel e Conteúdo */}
      <div className="ar-split">
        <FilterPanel
          searchPlaceholder="Buscar por título ou coordenador"
          searchValue={busca}
          onSearchChange={setBusca}
          groups={[
            {
              title: 'SITUAÇÃO',
              options: ['Inscrições', 'Em seleção', 'Ativo', 'Concluído'].map((s) => ({
                label: s,
                checked: filtroSituacao[s] ?? true,
                count: itens.filter((p) => p.situacao === s).length,
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
            summary={`Mostrando todos os ${filteredItens.length} projetos`}
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
              title="Nenhum projeto encontrado"
              description="Tente alterar os termos da busca ou redefinir os filtros aplicados."
              actions={
                <Button
                  onClick={() => {
                    setEixoAtivo('Tudo');
                    setBusca('');
                    setFiltroSituacao({
                      Inscrições: true,
                      'Em seleção': true,
                      Ativo: true,
                      Concluído: true,
                    });
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'lista' ? (
            <div className="ar-card-grid">
              {filteredItens.map((p, index) => {
                const isFixado = index === 0 && eixoAtivo === 'Tudo';

                return (
                  <RecordCard
                    key={p.id}
                    title={p.titulo}
                    tags={[p.eixo]}
                    badges={[
                      {
                        label: p.situacao,
                        tone: getStatusTone(p.situacao),
                      },
                    ]}
                    stamp={isFixado ? 'Fixado' : undefined}
                    tone={isFixado ? 'pink' : undefined}
                    meta={[
                      { label: 'Coordenador', value: p.autor },
                      { label: 'Vagas ofertadas', value: String(p.vagas) },
                    ]}
                    signal={{
                      tone: p.situacao === 'Inscrições' ? 'link' : 'muted',
                      label: `${p.vagas} ${p.vagas === 1 ? 'vaga disponível' : 'vagas disponíveis'}`,
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
              {(['Inscrições', 'Em seleção', 'Ativo', 'Concluído'] as const).map((sit) => {
                const colunaItens = filteredItens.filter((p) => p.situacao === sit);
                return (
                  <BoardColumn
                    key={sit}
                    title={sit}
                    tone={getStatusTone(sit)}
                    empty={`Nenhum projeto em ${sit.toLowerCase()}`}
                  >
                    {colunaItens.map((p) => (
                      <BoardCard
                        key={p.id}
                        title={p.titulo}
                        meta={p.autor}
                        badge={{
                          label: p.eixo,
                          tone: getStatusTone(p.eixo),
                        }}
                        footer={`${p.vagas} vagas`}
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

      {/* Modal Novo Projeto */}
      {modalNovo && (
        <Dialog
          title="Novo projeto"
          eyebrow="INICIATIVAS ACADÊMICAS"
          description="Submeta uma nova proposta de pesquisa, extensão, ensino ou inovação."
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
              label="Título do projeto"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Exemplo: Robótica educacional na Amazônia"
              autoFocus
            />

            <TextField
              label="Coordenador ou orientador"
              value={formAutor}
              onChange={(e) => setFormAutor(e.target.value)}
              placeholder="Exemplo: Prof. Marcos Tavares"
            />

            <ChoiceChips
              label="Eixo temático"
              options={['Pesquisa', 'Ensino', 'Extensão', 'Inovação']}
              value={formEixo}
              onChange={(v) => setFormEixo(v as any)}
            />

            <TextField
              label="Quantidade de vagas"
              type="number"
              value={formVagas}
              onChange={(e) => setFormVagas(e.target.value)}
              placeholder="Exemplo: 4"
            />

            <ChoiceChips
              label="Situação inicial"
              options={['Inscrições', 'Em seleção', 'Ativo', 'Concluído']}
              value={formSituacao}
              onChange={(v) => setFormSituacao(v as any)}
            />
          </form>
        </Dialog>
      )}
    </div>
  );
}
