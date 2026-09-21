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
  getPessoas,
  adicionarPessoa,
  atualizarPessoa,
  removerPessoa,
  salvarPessoas,
  subscribeToDataChanges,
} from '@/state/storage';
import type { Pessoa } from '@/mock-data';

export default function Pessoas() {
  const { showToast } = useToast();

  const [itens, setItens] = useState<Pessoa[]>(getPessoas);
  const [viewMode, setViewMode] = useState<string>('tabela');
  const [vinculoAtivo, setVinculoAtivo] = useState('Tudo');
  const [busca, setBusca] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalNovo, setModalNovo] = useState(false);

  // Edição
  const [modalEditar, setModalEditar] = useState(false);
  const [pessoaEditandoId, setPessoaEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editVinculo, setEditVinculo] = useState<'Aluno' | 'Professor' | 'Servidor'>('Aluno');
  const [editCurso, setEditCurso] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editErro, setEditErro] = useState('');

  // Filtros laterais
  const [filtroVinculo, setFiltroVinculo] = useState<Record<string, boolean>>({
    Aluno: true,
    Professor: true,
    Servidor: true,
  });

  // Modal form
  const [formNome, setFormNome] = useState('');
  const [formVinculo, setFormVinculo] = useState<'Aluno' | 'Professor' | 'Servidor'>('Aluno');
  const [formCurso, setFormCurso] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getPessoas());
    });
    return unsubscribe;
  }, []);

  const vinculosLista = ['Tudo', 'Aluno', 'Professor', 'Servidor'];

  const contagemVinculos = useMemo(() => {
    const map: Record<string, number> = { Tudo: itens.length };
    vinculosLista.slice(1).forEach((v) => {
      map[v] = itens.filter(
        (p) => p.vinculo.toLowerCase() === v.toLowerCase()
      ).length;
    });
    return vinculosLista.map((v) => ({
      label: v,
      count: map[v],
    }));
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = [...itens];

    if (vinculoAtivo !== 'Tudo') {
      result = result.filter(
        (p) => p.vinculo.toLowerCase() === vinculoAtivo.toLowerCase()
      );
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.cursoOuSetor.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    result = result.filter((p) => filtroVinculo[p.vinculo] ?? true);

    result.sort((a, b) => {
      return sortAsc
        ? a.nome.localeCompare(b.nome)
        : b.nome.localeCompare(a.nome);
    });

    return result;
  }, [itens, vinculoAtivo, busca, filtroVinculo, sortAsc]);

  const handleAbrirEdicao = (p: Pessoa) => {
    setPessoaEditandoId(p.id);
    setEditNome(p.nome);
    setEditVinculo(p.vinculo);
    setEditCurso(p.cursoOuSetor);
    setEditEmail(p.email);
    setEditErro('');
    setModalEditar(true);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNome.trim()) {
      setEditErro('O nome não pode ficar vazio.');
      return;
    }
    if (!pessoaEditandoId) return;

    atualizarPessoa(pessoaEditandoId, {
      nome: editNome.trim(),
      vinculo: editVinculo,
      cursoOuSetor: editCurso.trim() || 'Campus Belém',
      email: editEmail.trim(),
    });

    setModalEditar(false);
    setPessoaEditandoId(null);
    showToast({ message: 'Dados da pessoa atualizados com sucesso' });
  };

  const handleDelete = (pessoa: Pessoa) => {
    const backup = [...itens];
    removerPessoa(pessoa.id);

    showToast({
      message: 'Pessoa removida',
      action: {
        label: 'Desfazer',
        onClick: () => salvarPessoas(backup),
      },
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormErro('Digite o nome da pessoa');
      return;
    }

    adicionarPessoa({
      nome: formNome.trim(),
      vinculo: formVinculo,
      cursoOuSetor: formCurso.trim() || (formVinculo === 'Aluno' ? 'Técnico em Informática' : 'Campus Belém'),
      email: formEmail.trim() || `${formNome.toLowerCase().replace(/\s+/g, '.')}@ifpa.edu.br`,
    });

    setModalNovo(false);
    setFormNome('');
    setFormCurso('');
    setFormEmail('');
    setFormErro('');

    showToast({ message: 'Pessoa cadastrada com sucesso' });
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0
      ? itens.filter((i) => selectedIds.includes(i.id))
      : filteredItens;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Nome,Vínculo,Curso ou setor,E-mail']
        .concat(
          list.map(
            (p) => `"${p.nome}","${p.vinculo}","${p.cursoOuSetor}","${p.email}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'pessoas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelection = () => {
    const backup = [...itens];
    const remaining = itens.filter((i) => !selectedIds.includes(i.id));
    salvarPessoas(remaining);
    setSelectedIds([]);

    showToast({
      message: `${selectedIds.length} pessoas removidas`,
      action: {
        label: 'Desfazer',
        onClick: () => salvarPessoas(backup),
      },
    });
  };

  const columns: Column<Pessoa>[] = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      kind: 'strong',
      render: (p) => p.nome,
    },
    {
      key: 'vinculo',
      label: 'Vínculo',
      render: (p) => (
        <Badge tone={getStatusTone(p.vinculo)}>{p.vinculo}</Badge>
      ),
    },
    {
      key: 'cursoOuSetor',
      label: 'Curso ou setor',
      render: (p) => p.cursoOuSetor,
    },
    {
      key: 'email',
      label: 'E-mail institucional',
      kind: 'mono',
      render: (p) => p.email,
    },
    {
      key: 'id',
      label: 'Ações',
      render: (p) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirEdicao(p);
            }}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p);
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
        title="Pessoas"
        count={itens.length}
        tone="cyan"
        description="Diretório acadêmico de estudantes, docentes e servidores lotados no Campus Belém."
        actions={
          <>
            <Button
              variant="primary"
              iconRight="arrow-right"
              onClick={() => setModalNovo(true)}
            >
              Nova pessoa
            </Button>
            <Button icon="download" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* 2. ChipBar com vínculos */}
      <ChipBar
        items={contagemVinculos}
        value={vinculoAtivo}
        onChange={setVinculoAtivo}
      />

      {/* 3. Duas colunas: FilterPanel e Conteúdo */}
      <div className="ar-split">
        <FilterPanel
          searchPlaceholder="Buscar por nome ou e-mail"
          searchValue={busca}
          onSearchChange={setBusca}
          groups={[
            {
              title: 'VÍNCULO',
              options: ['Aluno', 'Professor', 'Servidor'].map((v) => ({
                label: v,
                checked: filtroVinculo[v] ?? true,
                count: itens.filter((p) => p.vinculo === v).length,
                onChange: (checked) =>
                  setFiltroVinculo((prev) => ({ ...prev, [v]: checked })),
              })),
            },
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <ViewToolbar
            view={viewMode}
            onViewChange={setViewMode}
            summary={`Mostrando todas as ${filteredItens.length} pessoas`}
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
              title="Nenhuma pessoa encontrada"
              description="Tente alterar os termos da busca ou redefinir os filtros aplicados."
              actions={
                <Button
                  onClick={() => {
                    setVinculoAtivo('Tudo');
                    setBusca('');
                    setFiltroVinculo({ Aluno: true, Professor: true, Servidor: true });
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'lista' ? (
            <div className="ar-card-grid">
              {filteredItens.map((p, index) => {
                const isFixado = index === 0 && vinculoAtivo === 'Tudo';

                return (
                  <RecordCard
                    key={p.id}
                    title={p.nome}
                    tags={[p.cursoOuSetor]}
                    badges={[
                      {
                        label: p.vinculo,
                        tone: getStatusTone(p.vinculo),
                      },
                    ]}
                    stamp={isFixado ? 'Fixado' : undefined}
                    tone={isFixado ? 'pink' : undefined}
                    meta={[
                      { label: 'E-mail', value: p.email },
                      { label: 'Lotação', value: p.cursoOuSetor },
                    ]}
                    onClick={() => handleAbrirEdicao(p)}
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
              {(['Aluno', 'Professor', 'Servidor'] as const).map((v) => {
                const colunaItens = filteredItens.filter((p) => p.vinculo === v);
                return (
                  <BoardColumn
                    key={v}
                    title={v}
                    tone={getStatusTone(v)}
                    empty={`Nenhuma pessoa vinculada como ${v.toLowerCase()}`}
                  >
                    {colunaItens.map((p) => (
                      <BoardCard
                        key={p.id}
                        title={p.nome}
                        meta={p.cursoOuSetor}
                        badge={{
                          label: v,
                          tone: getStatusTone(v),
                        }}
                        footer={p.email}
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

      {/* Modal Nova Pessoa */}
      {modalNovo && (
        <Dialog
          title="Nova pessoa"
          eyebrow="DIRETÓRIO ACADÊMICO"
          description="Cadastre um novo aluno, professor ou servidor no diretório do portal."
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
              label="Nome completo"
              value={formNome}
              onChange={(e) => {
                setFormNome(e.target.value);
                setFormErro('');
              }}
              error={formErro}
              placeholder="Exemplo: Carlos da Silva"
              autoFocus
            />

            <ChoiceChips
              label="Vínculo institucional"
              options={['Aluno', 'Professor', 'Servidor']}
              value={formVinculo}
              onChange={(v) => setFormVinculo(v as any)}
            />

            <TextField
              label="Curso ou setor de lotação"
              value={formCurso}
              onChange={(e) => setFormCurso(e.target.value)}
              placeholder="Exemplo: Técnico em Informática ou Coordenação de Pesquisa"
            />

            <TextField
              label="E-mail institucional"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="Exemplo: carlos.silva@ifpa.edu.br"
            />
          </form>
        </Dialog>
      )}

      {/* Modal Editar Pessoa */}
      {modalEditar && (
        <Dialog
          title="Editar pessoa / usuário"
          eyebrow="DIRETÓRIO ACADÊMICO"
          description="Altere as informações de cadastro, lotação ou vínculo desta pessoa."
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
              label="Nome completo"
              value={editNome}
              onChange={(e) => {
                setEditNome(e.target.value);
                setEditErro('');
              }}
              error={editErro}
              autoFocus
            />

            <ChoiceChips
              label="Vínculo institucional"
              options={['Aluno', 'Professor', 'Servidor']}
              value={editVinculo}
              onChange={(v) => setEditVinculo(v as any)}
            />

            <TextField
              label="Curso ou setor de lotação"
              value={editCurso}
              onChange={(e) => setEditCurso(e.target.value)}
            />

            <TextField
              label="E-mail institucional"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </form>
        </Dialog>
      )}
    </div>
  );
}
