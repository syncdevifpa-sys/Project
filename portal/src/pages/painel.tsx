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
} from '@/components/arcadia';
import {
  getAvisos,
  getTarefas,
  getDocumentos,
  getUsuarioSessao,
  subscribeToDataChanges,
} from '@/state/storage';

export default function Painel() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(getUsuarioSessao);
  const [avisos, setAvisos] = useState(getAvisos);
  const [tarefas, setTarefas] = useState(getTarefas);
  const [documentos, setDocumentos] = useState(getDocumentos);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setUsuario(getUsuarioSessao());
      setAvisos(getAvisos());
      setTarefas(getTarefas());
      setDocumentos(getDocumentos());
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PageHero
        title={`Olá, ${primeiroNome}`}
        tone="lime"
        size="large"
        description={`Você tem ${tarefasEmAberto} tarefas em aberto e ${documentosEmAnalise} documentos em análise. O próximo prazo é 12 set.`}
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
              <Badge tone="orange">Urgente</Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
              Início do período de matrícula — 14 set às 08:00
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>
            {formatCountdown(countdownSeconds)}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/calendario')}
          >
            Ver calendário & alertas
          </Button>
        </div>
      </div>

      <div className="ar-grid-3">
        <StatCard
          label="Avisos não lidos"
          value={Math.min(avisos.length, 2)}
          caption="Publicados desde sua última visita, em 17 set."
          link={{
            label: 'Abrir avisos',
            onClick: () => navigate('/avisos'),
          }}
        />

        <StatCard
          label="Tarefas em aberto"
          value={tarefasEmAberto}
          caption="A próxima vence em 12 set."
          link={{
            label: 'Ver tarefas',
            onClick: () => navigate('/tarefas'),
          }}
        />

        <StatCard
          label="Documentos em análise"
          value={documentosEmAnalise}
          caption="A secretaria responde até 26 set."
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
          <ListRow
            date={{ day: '01', month: 'set' }}
            title="Calendário do 2º semestre"
            trailing={<Badge tone="pink">Calendário</Badge>}
            onClick={() => navigate('/calendario')}
          />
          <ListRow
            date={{ day: '08', month: 'set' }}
            title="Histórico escolar completo"
            trailing={<Badge tone="green">Pronto</Badge>}
            onClick={() => navigate('/documentos')}
          />
          <ListRow
            date={{ day: '09', month: 'set' }}
            title="Aulas suspensas no Bloco C"
            trailing={<Badge tone="orange">Cancelamento</Badge>}
            onClick={() => navigate('/avisos')}
          />
          <ListRow
            date={{ day: '12', month: 'set' }}
            title="Confirmar disciplinas do semestre"
            trailing={<Badge tone="cyan">Aberta</Badge>}
            onClick={() => navigate('/tarefas')}
          />
        </ListPanel>

        <ListPanel
          label="Criados recentemente"
          action={
            <TextLink onClick={() => navigate('/avisos')}>
              Abrir avisos
            </TextLink>
          }
        >
          <ListRow
            title="Painel de dados abertos do campus"
            meta="Projetos"
            trailing="02 set"
            onClick={() => navigate('/projetos')}
          />
          <ListRow
            title="Termo de compromisso de estágio"
            meta="Documentos"
            trailing="02 set"
            onClick={() => navigate('/documentos')}
          />
          <ListRow
            title="Publicação do resultado PIBIC"
            meta="Calendário"
            trailing="01 set"
            onClick={() => navigate('/calendario')}
          />
          <ListRow
            title="Semana de Ciência e Tecnologia"
            meta="Avisos"
            trailing="29 ago"
            onClick={() => navigate('/avisos')}
          />
        </ListPanel>
      </div>
    </div>
  );
}
