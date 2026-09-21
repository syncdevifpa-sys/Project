import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHero,
  StatCard,
  ListPanel,
  ListRow,
  Badge,
  TextLink,
  Button,
  getStatusTone,
} from '@/components/arcadia';
import {
  getAvisos,
  getTarefas,
  getDocumentos,
  getEventosCalendario,
  getLembretes,
  getUsuarioSessao,
  subscribeToDataChanges,
} from '@/state/storage';

export default function Painel() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(getUsuarioSessao);
  const [avisos, setAvisos] = useState(getAvisos);
  const [tarefas, setTarefas] = useState(getTarefas);
  const [documentos, setDocumentos] = useState(getDocumentos);
  const [calendario, setCalendario] = useState(getEventosCalendario);
  const [lembretes, setLembretes] = useState(getLembretes);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setUsuario(getUsuarioSessao());
      setAvisos(getAvisos());
      setTarefas(getTarefas());
      setDocumentos(getDocumentos());
      setCalendario(getEventosCalendario());
      setLembretes(getLembretes());
    });
    return unsubscribe;
  }, []);

  const tarefasEmAberto = useMemo(() => {
    return tarefas.filter((t) => t.situacao !== 'Concluída').length;
  }, [tarefas]);

  const documentosEmAnalise = useMemo(() => {
    return documentos.filter(
      (d) => d.situacao === 'Em análise' || d.situacao === 'Solicitado'
    ).length;
  }, [documentos]);

  const [countdownSeconds, setCountdownSeconds] = useState(172800);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSecs: number) => {
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const primeiroNome = ((usuario && usuario.nome) || 'Ana').trim().split(/\s+/)[0];

  const proximoLembrete = lembretes.find((l) => l.ativo) || lembretes[0];

  const heroDescricao =
    tarefasEmAberto === 0 && documentosEmAnalise === 0
      ? 'Tudo em dia no portal! Você não possui tarefas pendentes ou documentos em análise no momento.'
      : `Você tem ${tarefasEmAberto} tarefa${tarefasEmAberto === 1 ? '' : 's'} em aberto e ${documentosEmAnalise} documento${documentosEmAnalise === 1 ? '' : 's'} em análise.`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PageHero
        title={`Olá, ${primeiroNome}`}
        tone="lime"
        size="large"
        description={heroDescricao}
        actions={
          <Button
            variant="primary"
            iconRight="arrow-right"
            onClick={() => navigate('/tarefas')}
          >
            Ver tarefas
          </Button>
        }
      />

      {/* Banner de Próximo Prazo Acadêmico & Cronômetro Regressivo (RF08) */}
      <div
        style={{
          background: 'var(--surface-raised)',
          border: '2px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-hard)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 24 }}>⏳</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Próximo Prazo Acadêmico Oficial (RF08)</span>
              <Badge tone={proximoLembrete ? 'orange' : 'neutral'}>
                {proximoLembrete ? 'Urgente' : 'Sem pendências'}
              </Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
              {proximoLembrete
                ? `${proximoLembrete.titulo} — ${proximoLembrete.data}${proximoLembrete.horario ? ` às ${proximoLembrete.horario}` : ''}`
                : 'Nenhum prazo acadêmico cadastrado. Configure seus lembretes em Configurações.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>
            {proximoLembrete ? formatCountdown(countdownSeconds) : '00d 00h 00m 00s'}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/configuracoes#lembretes')}
          >
            {proximoLembrete ? 'Ver lembretes' : '+ Novo lembrete'}
          </Button>
        </div>
      </div>

      <div className="ar-grid-3">
        <StatCard
          label="Avisos no portal"
          value={avisos.length}
          caption={avisos.length === 0 ? 'Nenhum aviso publicado.' : `${avisos.length} aviso(s) ativo(s).`}
          link={{
            label: 'Abrir avisos',
            onClick: () => navigate('/avisos'),
          }}
        />

        <StatCard
          label="Tarefas em aberto"
          value={tarefasEmAberto}
          caption={tarefasEmAberto === 0 ? 'Nenhuma pendência pendente.' : `${tarefasEmAberto} tarefa(s) para realizar.`}
          link={{
            label: 'Ver tarefas',
            onClick: () => navigate('/tarefas'),
          }}
        />

        <StatCard
          label="Documentos em análise"
          value={documentosEmAnalise}
          caption={documentosEmAnalise === 0 ? 'Nenhum documento pendente.' : `${documentosEmAnalise} processo(s) em análise.`}
          tone="pink"
          link={{
            label: 'Ver documentos',
            onClick: () => navigate('/documentos'),
          }}
        />
      </div>

      <div className="ar-grid-2">
        <ListPanel
          label="Próximas datas"
          action={
            <TextLink onClick={() => navigate('/calendario')}>
              Abrir calendário
            </TextLink>
          }
        >
          {calendario.length === 0 && tarefas.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
              Nenhuma data ou evento agendado no momento.
            </div>
          ) : (
            [...calendario.map((c) => ({
              id: c.id,
              titulo: c.titulo,
              data: c.data,
              categoria: c.categoria,
              tipo: 'calendario' as const,
            })), ...tarefas.map((t) => ({
              id: t.id,
              titulo: t.titulo,
              data: t.prazo,
              categoria: t.situacao,
              tipo: 'tarefas' as const,
            }))].slice(0, 4).map((item) => (
              <ListRow
                key={item.id}
                title={item.titulo}
                meta={item.data}
                trailing={<Badge tone={getStatusTone(item.categoria)}>{item.categoria}</Badge>}
                onClick={() => navigate(item.tipo === 'calendario' ? '/calendario' : '/tarefas')}
              />
            ))
          )}
        </ListPanel>

        <ListPanel
          label="Avisos recentes"
          action={
            <TextLink onClick={() => navigate('/avisos')}>
              Abrir avisos
            </TextLink>
          }
        >
          {avisos.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
              Nenhum aviso publicado recentemente.
            </div>
          ) : (
            avisos.slice(0, 4).map((a) => (
              <ListRow
                key={a.id}
                title={a.titulo}
                meta={a.data}
                trailing={<Badge tone={getStatusTone(a.categoria)}>{a.categoria}</Badge>}
                onClick={() => navigate(`/avisos/${a.id}`)}
              />
            ))
          )}
        </ListPanel>
      </div>
    </div>
  );
}
