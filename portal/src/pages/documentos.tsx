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
  getDocumentos,
  adicionarDocumento,
  atualizarDocumento,
  removerDocumento,
  salvarDocumentos,
  getLinksUteis,
  adicionarLinkUtil,
  removerLinkUtil,
  subscribeToDataChanges,
} from '@/state/storage';
import type { Documento, LinkUtil } from '@/mock-data';

export default function Documentos() {
  const { showToast } = useToast();

  const [itens, setItens] = useState<Documento[]>(getDocumentos);
  const [linksUteis, setLinksUteis] = useState<LinkUtil[]>(getLinksUteis);
  const [viewMode, setViewMode] = useState<string>('tabela');
  const [tipoAtivo, setTipoAtivo] = useState('Tudo');
  const [busca, setBusca] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalNovo, setModalNovo] = useState(false);

  // Links Úteis (RF09)
  const [modalNovoLink, setModalNovoLink] = useState(false);
  const [linkTitulo, setLinkTitulo] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescricao, setLinkDescricao] = useState('');
  const [linkCategoria, setLinkCategoria] = useState<'Sistemas' | 'Acadêmico' | 'Institucional' | 'Regulamentos'>('Sistemas');
  const [linkErro, setLinkErro] = useState('');

  // Edição de Documento
  const [modalEditar, setModalEditar] = useState(false);
  const [docEditandoId, setDocEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editProtocolo, setEditProtocolo] = useState('');
  const [editTipo, setEditTipo] = useState<'PDF' | 'Requerimento' | 'Assinatura' | 'Link' | 'E-mail'>('PDF');
  const [editPrevisao, setEditPrevisao] = useState('');
  const [editSituacao, setEditSituacao] = useState<'Pronto' | 'Em análise' | 'Solicitado' | 'Pendente'>('Em análise');
  const [editErro, setEditErro] = useState('');

  // Filtros laterais
  const [filtroSituacao, setFiltroSituacao] = useState<Record<string, boolean>>({
    Pronto: true,
    'Em análise': true,
    Solicitado: true,
    Pendente: true,
  });

  // Modal form
  const [formTitulo, setFormTitulo] = useState('');
  const [formTipo, setFormTipo] = useState<'PDF' | 'Requerimento' | 'Assinatura' | 'Link' | 'E-mail'>('PDF');
  const [formPrevisao, setFormPrevisao] = useState('26 set');
  const [formSituacao, setFormSituacao] = useState<'Pronto' | 'Em análise' | 'Solicitado' | 'Pendente'>('Em análise');
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getDocumentos());
      setLinksUteis(getLinksUteis());
    });
    return unsubscribe;
  }, []);

  const tiposLista = ['Tudo', 'PDF', 'Requerimento', 'Assinatura', 'Link', 'E-mail'];

  const contagemTipos = useMemo(() => {
    const map: Record<string, number> = { Tudo: itens.length };
    tiposLista.slice(1).forEach((t) => {
      map[t] = itens.filter(
        (d) => d.tipo.toLowerCase() === t.toLowerCase()
      ).length;
    });
    return tiposLista.map((t) => ({
      label: t,
      count: map[t],
    }));
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = [...itens];

    if (tipoAtivo !== 'Tudo') {
      result = result.filter(
        (d) => d.tipo.toLowerCase() === tipoAtivo.toLowerCase()
      );
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (d) =>
          d.titulo.toLowerCase().includes(q) ||
          d.protocolo.toLowerCase().includes(q) ||
          d.tipo.toLowerCase().includes(q)
      );
    }

    result = result.filter((d) => filtroSituacao[d.situacao] ?? true);

    result.sort((a, b) => {
      return sortAsc
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });

    return result;
  }, [itens, tipoAtivo, busca, filtroSituacao, sortAsc]);

  const handleAbrirEdicao = (doc: Documento) => {
    setDocEditandoId(doc.id);
    setEditTitulo(doc.titulo);
    setEditProtocolo(doc.protocolo);
    setEditTipo(doc.tipo);
    setEditPrevisao(doc.previsao);
    setEditSituacao(doc.situacao);
    setEditErro('');
    setModalEditar(true);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitulo.trim()) {
      setEditErro('O título não pode ficar vazio.');
      return;
    }
    if (!docEditandoId) return;

    atualizarDocumento(docEditandoId, {
      titulo: editTitulo.trim(),
      protocolo: editProtocolo.trim(),
      tipo: editTipo,
      previsao: editPrevisao.trim(),
      situacao: editSituacao,
    });

    setModalEditar(false);
    setDocEditandoId(null);
    showToast({ message: 'Documento atualizado com sucesso' });
  };

  const handleCriarLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitulo.trim() || !linkUrl.trim()) {
      setLinkErro('Título e link/URL são obrigatórios.');
      return;
    }

    adicionarLinkUtil({
      titulo: linkTitulo.trim(),
      url: linkUrl.trim(),
      descricao: linkDescricao.trim() || 'Portal institucional oficial.',
      categoria: linkCategoria,
    });

    setLinksUteis(getLinksUteis());
    setModalNovoLink(false);
    setLinkTitulo('');
    setLinkUrl('');
    setLinkDescricao('');
    setLinkErro('');
    showToast({ message: 'Link útil adicionado com sucesso' });
  };

  const handleExcluirLink = (id: string) => {
    removerLinkUtil(id);
    setLinksUteis(getLinksUteis());
    showToast({ message: 'Link removido' });
  };

  const handleDelete = (doc: Documento) => {
    const backup = [...itens];
    removerDocumento(doc.id);

    showToast({
      message: 'Documento excluído',
      action: {
        label: 'Desfazer',
        onClick: () => salvarDocumentos(backup),
      },
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Digite um título para o documento');
      return;
    }

    const protocolo = `${new Date().getFullYear()}.${Math.floor(1000 + Math.random() * 9000)}`;
    adicionarDocumento({
      titulo: formTitulo.trim(),
      protocolo,
      tipo: formTipo,
      previsao: formPrevisao.trim() || 'Sob consulta',
      situacao: formSituacao,
    });

    setModalNovo(false);
    setFormTitulo('');
    setFormErro('');

    showToast({ message: 'Documento cadastrado com sucesso' });
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0
      ? itens.filter((i) => selectedIds.includes(i.id))
      : filteredItens;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Título,Protocolo,Tipo,Previsão,Situação']
        .concat(
          list.map(
            (d) =>
              `"${d.titulo}","${d.protocolo}","${d.tipo}","${d.previsao}","${d.situacao}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'documentos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelection = () => {
    const backup = [...itens];
    const remaining = itens.filter((i) => !selectedIds.includes(i.id));
    salvarDocumentos(remaining);
    setSelectedIds([]);

    showToast({
      message: `${selectedIds.length} documentos excluídos`,
      action: {
        label: 'Desfazer',
        onClick: () => salvarDocumentos(backup),
      },
    });
  };

  const columns: Column<Documento>[] = [
    {
      key: 'titulo',
      label: 'Documento',
      sortable: true,
      kind: 'strong',
      render: (d) => d.titulo,
    },
    {
      key: 'protocolo',
      label: 'Protocolo',
      kind: 'mono',
      render: (d) => d.protocolo,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (d) => <Badge tone="cyan">{d.tipo}</Badge>,
    },
    {
      key: 'previsao',
      label: 'Previsão',
      kind: 'mono',
      render: (d) => d.previsao,
    },
    {
      key: 'situacao',
      label: 'Situação',
      render: (d) => (
        <Badge tone={getStatusTone(d.situacao)}>{d.situacao}</Badge>
      ),
    },
    {
      key: 'id',
      label: 'Ações',
      render: (d) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirEdicao(d);
            }}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(d);
            }}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 1. PageHero compacto */}
      <PageHero
        title="Documentos"
        count={itens.length}
        tone="cyan"
        description="Requerimentos, declarações e termos solicitados à secretaria acadêmica. Acompanhe o protocolo."
        actions={
          <>
            <Button
              variant="primary"
              iconRight="arrow-right"
              onClick={() => setModalNovo(true)}
            >
              Novo documento
            </Button>
            <Button icon="download" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* 2. ChipBar com tipos */}
      <ChipBar
        items={contagemTipos}
        value={tipoAtivo}
        onChange={setTipoAtivo}
      />

      {/* 3. Duas colunas: FilterPanel e Conteúdo */}
      <div className="ar-split">
        <FilterPanel
          searchPlaceholder="Buscar documento ou protocolo"
          searchValue={busca}
          onSearchChange={setBusca}
          groups={[
            {
              title: 'SITUAÇÃO',
              options: ['Pronto', 'Em análise', 'Solicitado', 'Pendente'].map((s) => ({
                label: s,
                checked: filtroSituacao[s] ?? true,
                count: itens.filter((d) => d.situacao === s).length,
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
            <EmptyState
              title="Nenhum documento encontrado"
              description="Tente alterar os termos da busca ou redefinir os filtros aplicados."
              actions={
                <Button
                  onClick={() => {
                    setTipoAtivo('Tudo');
                    setBusca('');
                    setFiltroSituacao({
                      Pronto: true,
                      'Em análise': true,
                      Solicitado: true,
                      Pendente: true,
                    });
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'lista' ? (
            <div className="ar-card-grid">
              {filteredItens.map((d, index) => {
                const isFixado = index === 0 && tipoAtivo === 'Tudo';
                const isUrgente = d.situacao === 'Em análise';

                return (
                  <RecordCard
                    key={d.id}
                    title={d.titulo}
                    tags={[d.tipo]}
                    badges={[
                      {
                        label: d.situacao,
                        tone: getStatusTone(d.situacao),
                      },
                    ]}
                    flag={isUrgente ? 'Urgente' : undefined}
                    stamp={isFixado ? 'Fixado' : undefined}
                    tone={isFixado ? 'pink' : undefined}
                    meta={[
                      { label: 'Protocolo', value: d.protocolo },
                      { label: 'Previsão', value: d.previsao },
                    ]}
                    signal={
                      d.situacao === 'Pronto'
                        ? { tone: 'link', label: 'Disponível para retirada' }
                        : { tone: 'muted', label: `Resposta até ${d.previsao}` }
                    }
                    onClick={() => handleAbrirEdicao(d)}
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
              {(['Solicitado', 'Em análise', 'Pronto', 'Pendente'] as const).map((sit) => {
                const colunaItens = filteredItens.filter((d) => d.situacao === sit);
                return (
                  <BoardColumn
                    key={sit}
                    title={sit}
                    tone={getStatusTone(sit)}
                    empty={`Nenhum documento ${sit.toLowerCase()}`}
                  >
                    {colunaItens.map((d) => (
                      <BoardCard
                        key={d.id}
                        title={d.titulo}
                        meta={`Protocolo ${d.protocolo}`}
                        badge={{
                          label: d.tipo,
                          tone: 'cyan',
                        }}
                        footer={d.previsao}
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

      {/* Modal Novo Documento */}
      {modalNovo && (
        <Dialog
          title="Novo documento"
          eyebrow="REQUERIMENTOS E DECLARAÇÕES"
          description="Envie uma solicitação para processamento junto à secretaria acadêmica."
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
              label="Nome do documento"
              value={formTitulo}
              onChange={(e) => {
                setFormTitulo(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Exemplo: Histórico escolar parcial"
              autoFocus
            />

            <ChoiceChips
              label="Tipo de solicitação"
              options={['PDF', 'Requerimento', 'Assinatura', 'Link', 'E-mail']}
              value={formTipo}
              onChange={(v) => setFormTipo(v as any)}
            />

            <ChoiceChips
              label="Situação inicial"
              options={['Solicitado', 'Em análise', 'Pronto', 'Pendente']}
              value={formSituacao}
              onChange={(v) => setFormSituacao(v as any)}
            />

            <TextField
              label="Previsão de conclusão"
              value={formPrevisao}
              onChange={(e) => setFormPrevisao(e.target.value)}
              placeholder="Exemplo: 26 set"
            />
          </form>
        </Dialog>
      )}

      {/* 4. Seção de Links Úteis e Documentos Institucionais (RF09) */}
      <div
        style={{
          marginTop: 20,
          padding: '20px 24px',
          background: 'var(--surface-raised)',
          border: '2px solid var(--line)',
          boxShadow: 'var(--shadow-hard)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>Links Úteis & Manuais Institucionais</span>
              <Badge tone="cyan">{linksUteis.length}</Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>
              Acesso direto a sistemas acadêmicos, biblioteca virtual, regulamentos pedagógicos e ouvidoria (RF09).
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() => setModalNovoLink(true)}
          >
            Novo link útil
          </Button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          {linksUteis.map((l) => (
            <div
              key={l.id}
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--line)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{l.titulo}</span>
                  <Badge tone="neutral">{l.categoria}</Badge>
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6, marginBottom: 0 }}>
                  {l.descricao}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  Acessar portal ↗
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExcluirLink(l.id)}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Editar Documento */}
      {modalEditar && (
        <Dialog
          title="Editar documento"
          eyebrow="SECRETARIA ACADÊMICA"
          description="Altere os dados, protocolo ou situação do documento selecionado."
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
              label="Nome do documento"
              value={editTitulo}
              onChange={(e) => {
                setEditTitulo(e.target.value);
                setEditErro('');
              }}
              error={editErro}
              autoFocus
            />

            <TextField
              label="Número de protocolo"
              value={editProtocolo}
              onChange={(e) => setEditProtocolo(e.target.value)}
            />

            <ChoiceChips
              label="Tipo de solicitação"
              options={['PDF', 'Requerimento', 'Assinatura', 'Link', 'E-mail']}
              value={editTipo}
              onChange={(v) => setEditTipo(v as any)}
            />

            <ChoiceChips
              label="Situação atual"
              options={['Solicitado', 'Em análise', 'Pronto', 'Pendente']}
              value={editSituacao}
              onChange={(v) => setEditSituacao(v as any)}
            />

            <TextField
              label="Previsão de conclusão"
              value={editPrevisao}
              onChange={(e) => setEditPrevisao(e.target.value)}
            />
          </form>
        </Dialog>
      )}

      {/* Modal Novo Link Útil (RF09) */}
      {modalNovoLink && (
        <Dialog
          title="Novo link útil"
          eyebrow="LINKS E MANUAIS (RF09)"
          description="Cadastre um novo link ou manual institucional oficial para todos os usuários."
          onClose={() => setModalNovoLink(false)}
          footer={
            <>
              <Button variant="primary" onClick={handleCriarLink}>
                Salvar link
              </Button>
              <Button variant="ghost" onClick={() => setModalNovoLink(false)}>
                Cancelar
              </Button>
            </>
          }
        >
          <form onSubmit={handleCriarLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="Título do recurso"
              value={linkTitulo}
              onChange={(e) => {
                setLinkTitulo(e.target.value);
                setLinkErro('');
              }}
              placeholder="Ex: SIGAA IFPA"
              error={linkErro}
              autoFocus
            />

            <TextField
              label="Endereço URL completo"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://sigaa.ifpa.edu.br"
            />

            <ChoiceChips
              label="Categoria"
              options={['Sistemas', 'Acadêmico', 'Institucional', 'Regulamentos']}
              value={linkCategoria}
              onChange={(v) => setLinkCategoria(v as any)}
            />

            <TextField
              label="Descrição sucinta"
              value={linkDescricao}
              onChange={(e) => setLinkDescricao(e.target.value)}
              placeholder="Descrição do recurso e utilidade"
            />
          </form>
        </Dialog>
      )}
    </div>
  );
}
