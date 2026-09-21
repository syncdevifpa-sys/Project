import { useState, useEffect } from 'react';
import {
  PageHero,
  SettingsNav,
  SettingsSection,
  SettingRow,
  ProfileHeader,
  ThemePicker,
  AccentPicker,
  SegmentedControl,
  Switch,
  TextField,
  Button,
  SaveBar,
  Dialog,
  Badge,
  ChoiceChips,
  useToast,
  type SaveBarState,
} from '@/components/arcadia';
import {
  applyTheme,
  applyAccent,
  applyTextSize,
  applyMotion,
  getStoredTheme,
  getStoredAccent,
  getStoredMotion,
  getStoredTextSize,
  type ThemeMode,
  type Field,
} from '@/lib/theme';
import {
  getUsuarioSessao,
  salvarUsuarioSessao,
  encerrarSessao,
  getLembretes,
  alternarLembrete,
  removerLembrete,
  adicionarLembrete,
  limparTodosDados,
  subscribeToDataChanges,
} from '@/state/storage';
import { api } from '@/lib/api';
import type { Lembrete } from '@/mock-data';

interface SessaoItem {
  id: string;
  dispositivo: string;
  ip: string;
  data: string;
  atual: boolean;
}

export default function Configuracoes() {
  const { showToast } = useToast();
  const [usuario, setUsuario] = useState(getUsuarioSessao);

  // Aparência (aplicada na hora)
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);
  const [accent, setAccentState] = useState<Field>(getStoredAccent);
  const [text, setText] = useState<'Padrão' | 'Grande'>(() =>
    getStoredTextSize() === 'large' ? 'Grande' : 'Padrão'
  );
  const [motion, setMotion] = useState<boolean>(getStoredMotion);

  // Dados Pessoais
  const [nome, setNome] = useState((usuario && usuario.nome) || '');
  const [nomeSocial, setNomeSocial] = useState('');
  const [emailPessoal, setEmailPessoal] = useState((usuario && usuario.email) || '');
  const [telefone, setTelefone] = useState('(91) 98888-1234');
  const [sobre, setSobre] = useState('');

  // Notificações
  const [notifUrgentes, setNotifUrgentes] = useState(true);
  const [notifEditais, setNotifEditais] = useState(true);
  const [notifResumo, setNotifResumo] = useState(false);

  // SaveBar
  const [saveState, setSaveState] = useState<SaveBarState>('clean');

  // Modais de segurança
  const [dialogConfirmSairOutros, setDialogConfirmSairOutros] = useState(false);
  const [modalAlterarSenha, setModalAlterarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState('');
  const [modalSessoes, setModalSessoes] = useState(false);
  const [sessoes, setSessoes] = useState<SessaoItem[]>([]);

  // Lembretes & Cronômetro (RF08)
  const [lembretes, setLembretes] = useState<Lembrete[]>(getLembretes);
  const [modalNovoLembrete, setModalNovoLembrete] = useState(false);
  const [novoLembreteTitulo, setNovoLembreteTitulo] = useState('');
  const [novoLembreteData, setNovoLembreteData] = useState('14 set');
  const [novoLembreteHorario, setNovoLembreteHorario] = useState('08:00');
  const [novoLembreteTipo, setNovoLembreteTipo] = useState<'prazo' | 'evento'>('prazo');
  const [lembreteErro, setLembreteErro] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(172800);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setLembretes(getLembretes());
    });
    return unsubscribe;
  }, []);

  const formatCountdown = (totalSecs: number) => {
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const handleCriarLembrete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLembreteTitulo.trim()) {
      setLembreteErro('O título do lembrete não pode ficar vazio.');
      return;
    }

    adicionarLembrete({
      titulo: novoLembreteTitulo.trim(),
      data: novoLembreteData.trim() || '14 set',
      horario: novoLembreteHorario.trim() || '08:00',
      tipo: novoLembreteTipo,
      ativo: true,
    });

    setLembretes(getLembretes());
    setModalNovoLembrete(false);
    setNovoLembreteTitulo('');
    setLembreteErro('');
    showToast({ message: 'Lembrete adicionado com sucesso' });
  };

  // Carregar dados reais do perfil do backend
  useEffect(() => {
    const u = getUsuarioSessao();
    setUsuario(u);
    setNome(u ? (u.nome || '') : '');

    api.get('/api/auth/perfil')
      .then((p) => {
        if (p) {
          if (p.nome) setNome(p.nome);
          if (p.nomeSocial) setNomeSocial(p.nomeSocial);
          if (p.emailPessoal) setEmailPessoal(p.emailPessoal);
          if (p.telefone) setTelefone(p.telefone);
          if (p.sobre) setSobre(p.sobre);
          if (p.preferences) {
            if (p.preferences.notifUrgentes !== undefined) setNotifUrgentes(p.preferences.notifUrgentes);
            if (p.preferences.notifEditais !== undefined) setNotifEditais(p.preferences.notifEditais);
            if (p.preferences.notifResumo !== undefined) setNotifResumo(p.preferences.notifResumo);
          }
        }
      })
      .catch(() => {});
  }, []);

  const touch = () => {
    setSaveState('dirty');
  };

  const handleThemeChange = (v: ThemeMode) => {
    setThemeState(v);
    applyTheme(v);
  };

  const handleAccentChange = (v: Field) => {
    setAccentState(v);
    applyAccent(v);
  };

  const handleTextSizeChange = (v: string) => {
    const choice = v === 'Grande' ? 'Grande' : 'Padrão';
    setText(choice);
    applyTextSize(choice === 'Grande' ? 'large' : 'default');
  };

  const handleMotionChange = (reduced: boolean) => {
    setMotion(reduced);
    applyMotion(reduced);
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const prefs = { notifUrgentes, notifEditais, notifResumo };
      salvarUsuarioSessao({
        nome,
        nomeSocial,
        emailPessoal,
        telefone,
        sobre,
        preferences: prefs,
      });

      await api.put('/api/auth/perfil', {
        nome,
        nomeSocial,
        emailPessoal,
        telefone,
        sobre,
        preferences: prefs,
      });

      setSaveState('saved');
      setTimeout(() => {
        setSaveState('clean');
      }, 2200);
    } catch {
      setSaveState('error');
    }
  };

  const handleDiscard = () => {
    const u = getUsuarioSessao();
    setNome(u ? (u.nome || '') : '');
    setEmailPessoal(u ? (u.email || '') : '');
    setSaveState('clean');
  };

  const handleAbrirSessoes = async () => {
    try {
      const res = await api.get<{ sessoes: SessaoItem[] }>('/api/auth/sessoes');
      if (res && res.sessoes) {
        setSessoes(res.sessoes);
      }
    } catch {
      setSessoes([
        {
          id: '1',
          dispositivo: 'Navegador atual (Linux / Firefox)',
          ip: '127.0.0.1',
          data: 'Conectado agora',
          atual: true,
        },
      ]);
    }
    setModalSessoes(true);
  };

  const handleConfirmarSairOutros = async () => {
    try {
      await api.post('/api/auth/logout-outros');
      setDialogConfirmSairOutros(false);
      showToast({ message: 'Todas as outras sessões foram encerradas.' });
    } catch (e: any) {
      setDialogConfirmSairOutros(false);
      showToast({ message: e.message || 'Erro ao encerrar outras sessões.' });
    }
  };

  const handleAlterarSenhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaErro('');

    if (!senhaAtual) {
      setSenhaErro('Informe sua senha atual.');
      return;
    }
    if (novaSenha.length < 8) {
      setSenhaErro('A nova senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaErro('A confirmação da senha não confere com a nova senha.');
      return;
    }

    try {
      await api.post('/api/auth/alterar-senha', {
        senhaAtual,
        novaSenha,
      });
      setModalAlterarSenha(false);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      showToast({ message: 'Senha alterada com sucesso.' });
    } catch (err: any) {
      setSenhaErro(err.message || 'Erro ao alterar senha.');
    }
  };

  const emailInvalido = emailPessoal && emailPessoal.indexOf('@') < 0;

  return (
    <>
      <PageHero
        title="Configurações"
        description="Seus dados, a aparência do portal e o que chega no seu e-mail. Tema e cor mudam na hora. Dados pessoais só mudam depois de salvar."
      />

      <div className="ar-split" style={{ marginTop: 12 }}>
        <SettingsNav
          items={[
            {
              label: 'Seus dados',
              description: 'Nome, contato e foto',
              icon: 'user',
              href: '#dados',
              active: true,
            },
            {
              label: 'Aparência',
              description: 'Tema e cor de destaque',
              icon: 'palette',
              href: '#aparencia',
            },
            {
              label: 'Notificações',
              description: 'E-mail e avisos no portal',
              icon: 'bell',
              href: '#notificacoes',
            },
            {
              label: 'Lembretes e Cronômetro',
              description: 'Prazos acadêmicos e alertas',
              icon: 'clock',
              href: '#lembretes',
            },
            {
              label: 'Conta e segurança',
              description: 'Senha e sessões',
              icon: 'shield-check',
              href: '#conta',
            },
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* Seção 1: Seus dados */}
          <SettingsSection
            id="dados"
            title="Seus dados"
            description="O que outras pessoas do campus veem em Pessoas. Campos com cadeado vêm da secretaria acadêmica."
          >
            <ProfileHeader
              name={nome}
              role={
                usuario && usuario.vinculo
                  ? usuario.vinculo.charAt(0).toUpperCase() + usuario.vinculo.slice(1).toLowerCase()
                  : 'Aluno'
              }
              course={(usuario && usuario.curso) || 'Técnico em Informática'}
              id={(usuario && usuario.matricula) || '2026104882'}
              verified={true}
              tone={accent}
            />

            <div className="ar-form-grid" style={{ marginTop: 24 }}>
              <TextField
                label="Nome completo"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  touch();
                }}
              />
              <TextField
                label="Nome social"
                optional
                placeholder="Como você quer ser chamada"
                hint="Se preenchido, aparece no lugar do nome civil em todo o portal."
                value={nomeSocial}
                onChange={(e) => {
                  setNomeSocial(e.target.value);
                  touch();
                }}
              />
              <TextField
                label="E-mail institucional"
                locked
                value={(usuario && usuario.email) || ''}
                hint="Gerenciado pela secretaria acadêmica."
              />
              <TextField
                label="E-mail pessoal"
                type="email"
                value={emailPessoal}
                error={emailInvalido ? 'Falta o @. Exemplo: nome@gmail.com' : undefined}
                hint="Usado só para recuperar a senha."
                onChange={(e) => {
                  setEmailPessoal(e.target.value);
                  touch();
                }}
              />
              <TextField
                label="Telefone"
                optional
                value={telefone}
                onChange={(e) => {
                  setTelefone(e.target.value);
                  touch();
                }}
              />
              <TextField
                label="Curso"
                locked
                value={(usuario && usuario.curso) || 'Técnico em Informática'}
              />
              <div className="ar-col-span-2">
                <TextField
                  label="Sobre você"
                  optional
                  multiline
                  placeholder="Uma frase para o seu perfil em Pessoas"
                  value={sobre}
                  onChange={(e) => {
                    setSobre(e.target.value);
                    touch();
                  }}
                />
              </div>
            </div>
          </SettingsSection>

          {/* Seção 2: Aparência */}
          <SettingsSection
            id="aparencia"
            title="Aparência"
            description="Personalize o tema e as cores do portal. Vale na hora neste dispositivo."
          >
            <SettingRow label="Tema" description="Claro, escuro ou automático acompanhando o sistema operacional.">
              <ThemePicker value={theme} onChange={handleThemeChange} />
            </SettingRow>

            <SettingRow label="Cor de destaque" description="Define a cor do banner nas seções principais.">
              <AccentPicker value={accent} onChange={handleAccentChange} />
            </SettingRow>

            <SettingRow label="Tamanho do texto" description="Aumenta todo o portal em cerca de 12%.">
              <SegmentedControl
                options={['Padrão', 'Grande']}
                value={text}
                onChange={handleTextSizeChange}
              />
            </SettingRow>

            <SettingRow
              label="Reduzir movimento"
              description="Desativa animações e transições na interface."
            >
              <Switch
                label="Reduzir movimento"
                checked={motion}
                onChange={handleMotionChange}
              />
            </SettingRow>
          </SettingsSection>

          {/* Seção 3: Notificações */}
          <SettingsSection
            id="notificacoes"
            title="Notificações"
            description="Escolha o que você quer receber no seu e-mail pessoal e nos avisos do portal."
          >
            <SettingRow
              label="Avisos urgentes"
              description="Cancelamentos de aula, avisos da direção e prazos finais."
            >
              <Switch
                label="Avisos urgentes"
                checked={notifUrgentes}
                onChange={(v) => {
                  setNotifUrgentes(v);
                  touch();
                }}
              />
            </SettingRow>

            <SettingRow
              label="Novos editais"
              description="Bolsas de pesquisa, monitoria e extensão assim que forem publicados."
            >
              <Switch
                label="Novos editais"
                checked={notifEditais}
                onChange={(v) => {
                  setNotifEditais(v);
                  touch();
                }}
              />
            </SettingRow>

            <SettingRow
              label="Resumo semanal"
              description="Toda segunda às 07:00, com os prazos da semana."
            >
              <Switch
                label="Resumo semanal"
                checked={notifResumo}
                onChange={(v) => {
                  setNotifResumo(v);
                  touch();
                }}
              />
            </SettingRow>
          </SettingsSection>

          {/* Seção Lembretes e Cronômetro (RF08) */}
          <SettingsSection
            id="lembretes"
            title="Lembretes e Cronômetro"
            description="Configure lembretes para eventos institucionais e acompanhe a contagem regressiva oficial até o próximo encerramento de prazo acadêmico (RF08)."
          >
            {/* Countdown Banner */}
            <div
              style={{
                background: 'var(--surface-sunken)',
                border: '2px solid var(--line)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {(() => {
                const proximoLembrete = lembretes.find((l) => l.ativo) || lembretes[0];
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)' }}>
                        Próximo Prazo Acadêmico Oficial (IFPA)
                      </span>
                      <Badge tone={proximoLembrete ? 'orange' : 'neutral'}>
                        {proximoLembrete ? 'Urgente' : 'Sem pendências'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                      ⏳ {proximoLembrete ? formatCountdown(countdownSeconds) : '00d 00h 00m 00s'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                      Marco vigente: <strong>{proximoLembrete ? `${proximoLembrete.titulo} (${proximoLembrete.data}${proximoLembrete.horario ? ` às ${proximoLembrete.horario}` : ''})` : 'Nenhum prazo ou evento cadastrado'}</strong>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Seus Lembretes Ativos</span>
              <Button size="sm" variant="secondary" onClick={() => setModalNovoLembrete(true)}>
                + Novo lembrete
              </Button>
            </div>

            {lembretes.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--ink-muted)',
                  fontSize: 14,
                  background: 'var(--surface-sunken)',
                  border: '1px dashed var(--line)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                }}
              >
                Nenhum lembrete cadastrado. Clique em <strong>+ Novo lembrete</strong> para registrar um prazo ou alerta acadêmico.
              </div>
            ) : (
              lembretes.map((l) => (
                <SettingRow
                  key={l.id}
                  label={l.titulo}
                  description={`Data: ${l.data}${l.horario ? ` às ${l.horario}` : ''} · Tipo: ${l.tipo === 'prazo' ? 'Prazo Acadêmico' : 'Evento Institucional'}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Switch
                      label={l.ativo ? 'Ativo' : 'Inativo'}
                      checked={l.ativo}
                      onChange={() => {
                        alternarLembrete(l.id);
                        setLembretes(getLembretes());
                        showToast({ message: l.ativo ? 'Lembrete desativado' : 'Lembrete ativado' });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removerLembrete(l.id);
                        setLembretes((prev) => prev.filter((it) => String(it.id) !== String(l.id)));
                        showToast({ message: 'Lembrete excluído' });
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </SettingRow>
              ))
            )}
          </SettingsSection>

          {/* Seção 4: Conta e segurança */}
          <SettingsSection id="conta" title="Conta e segurança">
            <SettingRow label="Senha" description="Última alteração registrada no sistema.">
              <Button size="sm" onClick={() => setModalAlterarSenha(true)}>
                Alterar senha
              </Button>
            </SettingRow>

            <SettingRow
              label="Sessões ativas"
              description="Dispositivos conectados à sua conta."
            >
              <Button size="sm" onClick={handleAbrirSessoes}>
                Ver sessões
              </Button>
            </SettingRow>

            <SettingRow
              label="Iniciar do zero"
              description="Remove todos os avisos, tarefas e lembretes para testar as funcionalidades com dados 100% limpos."
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  limparTodosDados();
                  setLembretes([]);
                  showToast({ message: 'Sistema zerado com sucesso! Nenhum aviso ou lembrete falso.' });
                }}
              >
                Começar do zero
              </Button>
            </SettingRow>

            <SettingRow
              label="Sair deste dispositivo"
              description="Encerra o acesso neste navegador e retorna à tela de login."
            >
              <Button size="sm" icon="log-out" onClick={encerrarSessao}>
                Sair
              </Button>
            </SettingRow>

            <SettingRow
              label="Sair dos outros dispositivos"
              description="Encerra as sessões no celular e no outro computador. Este navegador continua conectado."
            >
              <Button
                size="sm"
                variant="danger"
                icon="log-out"
                onClick={() => setDialogConfirmSairOutros(true)}
              >
                Sair dos outros
              </Button>
            </SettingRow>
          </SettingsSection>

          {/* SaveBar dock */}
          <div className="ar-savebar-dock">
            <SaveBar
              state={saveState}
              onDiscard={handleDiscard}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>

      {/* Modal Alterar Senha */}
      {modalAlterarSenha && (
        <Dialog
          title="Alterar senha"
          eyebrow="SEGURANÇA DA CONTA"
          description="Digite sua senha atual e escolha uma nova senha segura com pelo menos 8 caracteres."
          onClose={() => setModalAlterarSenha(false)}
          footer={
            <>
              <Button variant="primary" onClick={handleAlterarSenhaSubmit}>
                Salvar nova senha
              </Button>
              <Button variant="ghost" onClick={() => setModalAlterarSenha(false)}>
                Cancelar
              </Button>
            </>
          }
        >
          <form onSubmit={handleAlterarSenhaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField
              label="Senha atual"
              type="password"
              value={senhaAtual}
              placeholder="Sua senha atual"
              onChange={(e) => setSenhaAtual(e.target.value)}
              error={senhaErro.includes('atual') ? senhaErro : undefined}
            />
            <TextField
              label="Nova senha"
              type="password"
              value={novaSenha}
              placeholder="No mínimo 8 caracteres"
              hint="Use números, letras e símbolos para maior segurança."
              onChange={(e) => setNovaSenha(e.target.value)}
              error={senhaErro.includes('mínimo') ? senhaErro : undefined}
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              value={confirmarSenha}
              placeholder="Repita a nova senha"
              onChange={(e) => setConfirmarSenha(e.target.value)}
              error={senhaErro.includes('confirmação') ? senhaErro : (!senhaErro.includes('atual') && !senhaErro.includes('mínimo') ? senhaErro : undefined)}
            />
          </form>
        </Dialog>
      )}

      {/* Modal Ver Sessões */}
      {modalSessoes && (
        <Dialog
          title="Sessões ativas"
          eyebrow="SEGURANÇA"
          description="Dispositivos conectados à sua conta no portal Arcádia."
          onClose={() => setModalSessoes(false)}
          footer={
            <Button variant="primary" onClick={() => setModalSessoes(false)}>
              Fechar
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessoes.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.dispositivo}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                    IP: {s.ip} · {s.data}
                  </div>
                </div>
                {s.atual ? (
                  <Badge tone="green">Este dispositivo</Badge>
                ) : (
                  <Badge tone="neutral">Ativa</Badge>
                )}
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {/* Diálogo Confirmar Sair dos Outros */}
      {dialogConfirmSairOutros && (
        <Dialog
          title="Sair dos outros dispositivos?"
          description="Você vai precisar entrar de novo no celular e no outro computador. Este navegador continua conectado."
          onClose={() => setDialogConfirmSairOutros(false)}
          footer={
            <>
              <Button
                variant="primary"
                onClick={handleConfirmarSairOutros}
              >
                Sair dos outros dispositivos
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDialogConfirmSairOutros(false)}
              >
                Cancelar
              </Button>
            </>
          }
        />
      )}

      {/* Modal Novo Lembrete (RF08) */}
      {modalNovoLembrete && (
        <Dialog
          title="Novo lembrete acadêmico"
          eyebrow="ALERTAS E PRAZOS (RF08)"
          description="Cadastre um lembrete com contagem regressiva para não perder datas importantes."
          onClose={() => setModalNovoLembrete(false)}
          footer={
            <>
              <Button variant="primary" onClick={handleCriarLembrete}>
                Salvar lembrete
              </Button>
              <Button variant="ghost" onClick={() => setModalNovoLembrete(false)}>
                Cancelar
              </Button>
            </>
          }
        >
          <form onSubmit={handleCriarLembrete} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="Título do lembrete"
              value={novoLembreteTitulo}
              onChange={(e) => {
                setNovoLembreteTitulo(e.target.value);
                setLembreteErro('');
              }}
              placeholder="Ex: Confirmação de Matrícula"
              error={lembreteErro}
              autoFocus
            />

            <TextField
              label="Data do marco"
              value={novoLembreteData}
              onChange={(e) => setNovoLembreteData(e.target.value)}
              placeholder="Ex: 14 set"
            />

            <TextField
              label="Horário (opcional)"
              value={novoLembreteHorario}
              onChange={(e) => setNovoLembreteHorario(e.target.value)}
              placeholder="Ex: 08:00"
            />

            <ChoiceChips
              label="Tipo de evento"
              options={['prazo', 'evento']}
              value={novoLembreteTipo}
              onChange={(v) => setNovoLembreteTipo(v as any)}
            />
          </form>
        </Dialog>
      )}
    </>
  );
}
