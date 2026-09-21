import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  getAvisos,
  adicionarAviso,
  atualizarAviso,
  removerAviso,
  salvarAvisos,
  getUsuarioSessao,
  getCategorias,
  adicionarCategoria,
  subscribeToDataChanges,
} from '@/state/storage';
import type { Aviso } from '@/mock-data';

export default function Avisos() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const usuario = getUsuarioSessao();

  const [itens, setItens] = useState<Aviso[]>(getAvisos);
  const [viewMode, setViewMode] = useState<string>('lista');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Tudo');
  const [busca, setBusca] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [modalNovaCategoria, setModalNovaCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [categoriasLista, setCategoriasLista] = useState<string[]>(getCategorias);

  // Filtros laterais
  const [filtroPublico, setFiltroPublico] = useState<Record<string, boolean>>({
    Todos: true,
    Aluno: true,
    Professor: true,
    Servidor: true,
  });
  const [filtroSituacao, setFiltroSituacao] = useState<Record<string, boolean>>({
    Publicado: true,
    Rascunho: true,
    Arquivado: true,
  });

  // Estado do formulário do modal
  const [formTitulo, setFormTitulo] = useState('');
  const [formResumo, setFormResumo] = useState('');
  const [formCategoria, setFormCategoria] = useState('Matrícula');
  const [formPublico, setFormPublico] = useState('Todos');
  const [formData, setFormData] = useState('Hoje');
  const [formSituacao, setFormSituacao] = useState<'Publicado' | 'Rascunho' | 'Arquivado'>('Publicado');
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getAvisos());
    });
    return unsubscribe;
  }, []);

  const categorias = useMemo(() => {
    return [{ label: 'Tudo' }, ...categoriasLista.map((c) => ({ label: c }))];
  }, [categoriasLista]);

  const contagemCategorias = useMemo(() => {
    const map: Record<string, number> = { Tudo: itens.length };
    categorias.slice(1).forEach((c) => {
      map[c.label] = itens.filter(
        (a) => a.categoria.toLowerCase() === c.label.toLowerCase()
      ).length;
    });
    return categorias.map((c) => ({
      label: c.label,
      count: map[c.label] || 0,
    }));
  }, [itens, categorias]);

  const filteredItens = useMemo(() => {
    let result = [...itens];

    if (categoriaAtiva !== 'Tudo') {
      result = result.filter(
        (item) => item.categoria.toLowerCase() === categoriaAtiva.toLowerCase()
      );
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (item) =>
          item.titulo.toLowerCase().includes(q) ||
          item.resumo.toLowerCase().includes(q) ||
          item.publico.toLowerCase().includes(q)
      );
    }

    result = result.filter((item) => {
      const pubMatch = filtroPublico[item.publico] ?? true;
      const sitMatch = filtroSituacao[item.situacao] ?? true;
      return pubMatch && sitMatch;
    });

    result.sort((a, b) => {
      return sortAsc
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });

    return result;
  }, [itens, categoriaAtiva, busca, filtroPublico, filtroSituacao, sortAsc]);

  const handleDelete = (aviso: Aviso) => {
    const backup = [...itens];
    removerAviso(aviso.id);

    showToast({
      message: 'Aviso excluído',
      action: {
        label: 'Desfazer',
        onClick: () => {
          salvarAvisos(backup);
        },
      },
    });
  };

  const handleAbrirEdicao = (a: Aviso) => {
    setEditandoId(a.id);
    setFormTitulo(a.titulo);
    setFormResumo(a.resumo);
    const cat = a.categoria ? a.categoria.charAt(0).toUpperCase() + a.categoria.slice(1).toLowerCase() : 'Matrícula';
    setFormCategoria(cat);
    setFormPublico(a.publico);
    setFormData(a.data);
    setFormSituacao(a.situacao);
    setFormErro('');
    setModalEditar(true);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite um título para o aviso');
      return;
    }
    if (!editandoId) return;

    atualizarAviso(editandoId, {
      titulo: formTitulo.trim(),
      resumo: formResumo.trim() || 'Sem descrição informada.',
      categoria: formCategoria.toLowerCase() as any,
      publico: formPublico,
      data: formData || 'Hoje',
      situacao: formSituacao,
    });

    setModalEditar(false);
    setEditandoId(null);
    showToast({ message: 'Aviso atualizado com sucesso' });
  };

  const handleCriarCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoriaNome.trim()) return;
    adicionarCategoria(novaCategoriaNome.trim());
    setCategoriasLista(getCategorias());
    setModalNovaCategoria(false);
    setNovaCategoriaNome('');
    showToast({ message: 'Nova categoria adicionada' });
  };

  const handleFiltrarMeuPerfil = () => {
    const v = usuario?.vinculo
      ? usuario.vinculo.charAt(0).toUpperCase() + usuario.vinculo.slice(1).toLowerCase()
      : 'Aluno';
    setFiltroPublico({
      Todos: true,
      Aluno: v === 'Aluno',
      Professor: v === 'Professor',
      Servidor: v === 'Servidor',
    });
    showToast({ message: `Filtrando para seu perfil: ${v}` });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite um título para o aviso');
      return;
    }

    adicionarAviso({
      titulo: formTitulo.trim(),
      resumo: formResumo.trim() || 'Sem descrição informada.',
      categoria: formCategoria.toLowerCase() as any,
      publico: formPublico,
      data: formData || 'Hoje',
      situacao: formSituacao,
    });

    setModalNovo(false);
    setFormTitulo('');
    setFormResumo('');
    setFormErro('');

    showToast({ message: 'Aviso criado com sucesso' });
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0
      ? itens.filter((i) => selectedIds.includes(i.id))
      : filteredItens;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Título,Categoria,Público,Data,Situação']
        .concat(
          list.map(
            (a) =>
              `"${a.titulo}","${a.categoria}","${a.publico}","${a.data}","${a.situacao}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'avisos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelection = () => {
    const backup = [...itens];
    const remaining = itens.filter((i) => !selectedIds.includes(i.id));
    salvarAvisos(remaining);
    setSelectedIds([]);

    showToast({
      message: `${selectedIds.length} avisos excluídos`,
      action: {
        label: 'Desfazer',
        onClick: () => {
          salvarAvisos(backup);
        },
      },
    });
  };

  const columns: Column<Aviso>[] = [
    {
      key: 'titulo',
      label: 'Título',
      sortable: true,
      kind: 'strong',
      render: (a) => (
        <a
          href={`/avisos/${a.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/avisos/${a.id}`);
          }}
          className="ar-link"
        >
          {a.titulo}
        </a>
      ),
    },
    {
      key: 'resumo',
      label: 'Resumo',
      render: (a) => a.resumo,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      render: (a) => (
        <Badge tone={getStatusTone(a.categoria)}>
          {a.categoria.charAt(0).toUpperCase() + a.categoria.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'publico',
      label: 'Público',
      render: (a) => a.publico,
    },
    {
      key: 'data',
      label: 'Data',
      kind: 'mono',
      render: (a) => a.data,
    },
    {
      key: 'situacao',
      label: 'Situação',
      render: (a) => (
        <Badge tone={getStatusTone(a.situacao)}>{a.situacao}</Badge>
      ),
    },
    {
      key: 'id',
      label: 'Ações',
      render: (a) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirEdicao(a);
            }}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(a);
            }}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const userVinculoLabel = usuario?.vinculo
    ? usuario.vinculo.charAt(0).toUpperCase() + usuario.vinculo.slice(1).toLowerCase()
    : 'Aluno';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1. PageHero compacto */}
      <PageHero
        title="Avisos"
        count={itens.length}
        tone="cyan"
        description="Comunicados oficiais do campus sobre matrícula, editais, eventos e calendário. Os fixados aparecem primeiro."
        actions={
          <>
            <Button
              variant="primary"
              iconRight="arrow-right"
              onClick={() => setModalNovo(true)}
            >
              Novo aviso
            </Button>
            <Button variant="ghost" onClick={() => setModalNovaCategoria(true)}>
              Nova categoria
            </Button>
            <Button variant="ghost" onClick={handleFiltrarMeuPerfil}>
              Filtrar por perfil ({userVinculoLabel})
            </Button>
            <Button icon="download" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* 2. ChipBar com categorias */}
      <ChipBar
        items={contagemCategorias}
        value={categoriaAtiva}
        onChange={setCategoriaAtiva}
      />

      {/* 3. Duas colunas: FilterPanel (240px) e Conteúdo */}
      <div className="ar-split">
        <FilterPanel
          searchPlaceholder="Buscar aviso"
          searchValue={busca}
          onSearchChange={setBusca}
          groups={[
            {
              title: 'PÚBLICO',
              options: ['Todos', 'Aluno', 'Professor', 'Servidor'].map((p) => ({
                label: p,
                checked: filtroPublico[p] ?? true,
                count: itens.filter((a) => a.publico === p).length,
                onChange: (checked) =>
                  setFiltroPublico((prev) => ({ ...prev, [p]: checked })),
              })),
            },
            {
              title: 'SITUAÇÃO',
              options: ['Publicado', 'Rascunho', 'Arquivado'].map((s) => ({
                label: s,
                checked: filtroSituacao[s] ?? true,
                count: itens.filter((a) => a.situacao === s).length,
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
            summary={`Mostrando todos os ${filteredItens.length}`}
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
            itens.length === 0 ? (
              <EmptyState
                title="Nenhum aviso cadastrado"
                description="O mural de avisos está pronto para receber suas publicações. Clique no botão abaixo para cadastrar seu primeiro aviso."
                actions={
                  <Button variant="primary" onClick={() => setModalNovo(true)}>
                    + Criar primeiro aviso
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Nenhum aviso encontrado"
                description="Tente alterar os termos da busca ou redefinir os filtros aplicados."
                actions={
                  <Button
                    onClick={() => {
                      setCategoriaAtiva('Tudo');
                      setBusca('');
                      setFiltroPublico({ Todos: true, Aluno: true, Professor: true, Servidor: true });
                      setFiltroSituacao({ Publicado: true, Rascunho: true, Arquivado: true });
                    }}
                  >
                    Limpar filtros
                  </Button>
                }
              />
            )
          ) : viewMode === 'lista' ? (
            <div className="ar-card-grid">
              {filteredItens.map((a, index) => {
                // O primeiro aviso é fixado (destaque em rosa, carimbo FIXADO)
                const isFixado = index === 0 && categoriaAtiva === 'Tudo';
                const isUrgente = a.categoria === 'cancelamento' || a.categoria === 'matricula';

                return (
                  <RecordCard
                    key={a.id}
                    title={a.titulo}
                    description={a.resumo}
                    tags={[
                      a.publico,
                      a.categoria.charAt(0).toUpperCase() + a.categoria.slice(1),
                    ]}
                    badges={[
                      {
                        label: a.situacao,
                        tone: getStatusTone(a.situacao),
                      },
                    ]}
                    flag={isUrgente ? 'Urgente' : undefined}
                    stamp={isFixado ? 'Fixado' : undefined}
                    tone={isFixado ? 'pink' : undefined}
                    meta={[
                      { label: 'Prazo', value: a.data },
                      { label: 'Público', value: a.publico },
                    ]}
                    signal={
                      a.situacao === 'Publicado'
                        ? { tone: 'link', label: 'Atualizado hoje às 09:12' }
                        : undefined
                    }
                    onClick={() => navigate(`/avisos/${a.id}`)}
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
              {(['Publicado', 'Rascunho', 'Arquivado'] as const).map((sit) => {
                const colunaItens = filteredItens.filter((a) => a.situacao === sit);
                return (
                  <BoardColumn
                    key={sit}
                    title={sit}
                    tone={getStatusTone(sit)}
                    empty={`Nenhum aviso em ${sit.toLowerCase()}`}
                  >
                    {colunaItens.map((a) => (
                      <BoardCard
                        key={a.id}
                        title={a.titulo}
                        meta={`${a.publico} · ${a.data}`}
                        badge={{
                          label: a.categoria.charAt(0).toUpperCase() + a.categoria.slice(1),
                          tone: getStatusTone(a.categoria),
                        }}
                        footer={a.data}
                        action={{
                          label: 'Abrir',
                          onClick: () => navigate(`/avisos/${a.id}`),
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

      {/* Seleção em lote */}
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

      {/* Modal Novo Aviso */}
      {modalNovo && (
        <Dialog
          title="Novo aviso"
          eyebrow="COMUNICADOS OFICIAIS"
          description="Preencha os campos para publicar um aviso no portal."
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
              label="Título do aviso"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Exemplo: Período de matrícula 2026/2"
              autoFocus
            />

            <TextField
              label="Resumo"
              multiline
              rows={3}
              value={formResumo}
              onChange={(e) => setFormResumo(e.target.value)}
              placeholder="Descreva o comunicado em uma ou duas frases"
            />

            <ChoiceChips
              label="Categoria"
              options={categoriasLista}
              value={formCategoria}
              onChange={setFormCategoria}
            />

            <ChoiceChips
              label="Público"
              options={['Todos', 'Aluno', 'Professor', 'Servidor']}
              value={formPublico}
              onChange={setFormPublico}
            />

            <ChoiceChips
              label="Situação"
              options={['Publicado', 'Rascunho', 'Arquivado']}
              value={formSituacao}
              onChange={(v) => setFormSituacao(v as any)}
            />

            <TextField
              label="Data de referência"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              placeholder="Exemplo: 27 set"
            />
          </form>
        </Dialog>
      )}

      {/* Modal Editar Aviso (Administrador - RF03/RF04) */}
      {modalEditar && (
        <Dialog
          title="Editar aviso"
          eyebrow="GESTÃO DE CONTEÚDO"
          description="Altere as informações do comunicado oficial."
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
              label="Título do aviso"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Título da publicação"
              autoFocus
            />

            <TextField
              label="Resumo"
              multiline
              rows={3}
              value={formResumo}
              onChange={(e) => setFormResumo(e.target.value)}
              placeholder="Descreva o comunicado"
            />

            <ChoiceChips
              label="Categoria"
              options={categoriasLista}
              value={formCategoria}
              onChange={setFormCategoria}
            />

            <ChoiceChips
              label="Público"
              options={['Todos', 'Aluno', 'Professor', 'Servidor']}
              value={formPublico}
              onChange={setFormPublico}
            />

            <ChoiceChips
              label="Situação"
              options={['Publicado', 'Rascunho', 'Arquivado']}
              value={formSituacao}
              onChange={(v) => setFormSituacao(v as any)}
            />

            <TextField
              label="Data de referência"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              placeholder="Exemplo: 27 set"
            />
          </form>
        </Dialog>
      )}

      {/* Modal Nova Categoria (Administrador - Gerenciar Categorias) */}
      {modalNovaCategoria && (
        <Dialog
          title="Nova categoria de notícias"
          eyebrow="GESTÃO DE CATEGORIAS"
          description="Cadastre uma nova categoria para classificar os avisos institucionais."
          onClose={() => setModalNovaCategoria(false)}
          footer={
            <>
              <Button variant="primary" onClick={handleCriarCategoria}>
                Salvar categoria
              </Button>
              <Button variant="ghost" onClick={() => setModalNovaCategoria(false)}>
                Cancelar
              </Button>
            </>
          }
        >
          <form onSubmit={handleCriarCategoria} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="Nome da categoria"
              value={novaCategoriaNome}
              onChange={(e) => setNovaCategoriaNome(e.target.value)}
              placeholder="Exemplo: Estágio, Monitoria, Pesquisa..."
              autoFocus
            />
          </form>
        </Dialog>
      )}
    </div>
  );
}
