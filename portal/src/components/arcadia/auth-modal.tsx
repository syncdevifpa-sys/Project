import React, { useState } from 'react';
import {
  TextField,
  Button,
  SegmentedControl,
  ChoiceChips,
  useToast,
} from '@/components/arcadia';
import { api } from '@/lib/api';
import { definirSessao } from '@/state/storage';
import type { Usuario, Vinculo } from '@/mock-data';

interface AuthModalProps {
  onSuccess?: (user?: Usuario) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'Entrar' | 'Criar conta'>('Entrar');

  // Estado Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [loginCarregando, setLoginCarregando] = useState(false);

  // Estado Cadastro
  const [cadNome, setCadNome] = useState('');
  const [cadVinculo, setCadVinculo] = useState<string>('Aluno');
  const [cadCurso, setCadCurso] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');
  const [cadErro, setCadErro] = useState('');
  const [cadCarregando, setCadCarregando] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErro('');

    if (!loginEmail.trim() || !loginSenha) {
      setLoginErro('Informe seu e-mail institucional e senha.');
      return;
    }

    setLoginCarregando(true);
    try {
      const res = await api.post('/api/auth/login', {
        email: loginEmail.trim(),
        senha: loginSenha,
      });

      if (res && res.usuario) {
        const u: Usuario = {
          id: String(res.usuario.id),
          nome: res.usuario.nome,
          email: res.usuario.email,
          vinculo: (res.usuario.vinculo?.toLowerCase() as Vinculo) || 'aluno',
          curso: res.usuario.curso || '',
          matricula: res.usuario.matricula || '',
        };
        definirSessao(u, res.token);
        showToast({ message: `Bem-vindo de volta, ${u.nome}!` });
        onSuccess?.(u);
      }
    } catch (err: any) {
      setLoginErro(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoginCarregando(false);
    }
  };

  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadErro('');

    if (!cadNome.trim()) {
      setCadErro('Informe seu nome completo.');
      return;
    }
    if (!cadEmail.trim()) {
      setCadErro('Informe seu e-mail institucional.');
      return;
    }
    if (cadSenha.length < 8) {
      setCadErro('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setCadCarregando(true);
    try {
      const res = await api.post('/api/auth/cadastro', {
        nome: cadNome.trim(),
        vinculo: cadVinculo,
        curso: cadCurso.trim() || (cadVinculo === 'Aluno' ? 'Técnico em Informática' : 'Campus Belém'),
        email: cadEmail.trim(),
        senha: cadSenha,
      });

      if (res && res.usuario) {
        const u: Usuario = {
          id: String(res.usuario.id),
          nome: res.usuario.nome,
          email: res.usuario.email,
          vinculo: (res.usuario.vinculo?.toLowerCase() as Vinculo) || 'aluno',
          curso: res.usuario.curso || '',
          matricula: res.usuario.matricula || '',
        };
        definirSessao(u, res.token);
        showToast({ message: `Conta criada com sucesso! Olá, ${u.nome}.` });
        onSuccess?.(u);
      }
    } catch (err: any) {
      setCadErro(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setCadCarregando(false);
    }
  };

  const preencherContaTeste = () => {
    setLoginEmail('ana.ribeiro@ifpa.edu.br');
    setLoginSenha('12345678');
    setLoginErro('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--canvas)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-float)',
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Marca Arcádia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              background: 'var(--lime)',
              color: 'var(--on-field)',
              fontWeight: 700,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em' }}>Arcádia</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '0.08em' }}>
              IFPA CAMPUS BELÉM
            </div>
          </div>
        </div>

        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {tab === 'Entrar' ? 'Acessar o portal' : 'Criar sua conta'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
            {tab === 'Entrar'
              ? 'Informe suas credenciais institucionais para entrar.'
              : 'Cadastre-se para ter acesso completo a editais, projetos e avisos.'}
          </p>
        </div>

        {/* Abas Entrar / Criar conta */}
        <SegmentedControl
          options={['Entrar', 'Criar conta']}
          value={tab}
          onChange={(v) => {
            setTab(v as any);
            setLoginErro('');
            setCadErro('');
          }}
        />

        {/* Formulário: Entrar */}
        {tab === 'Entrar' ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="E-mail institucional"
              type="email"
              placeholder="nome@ifpa.edu.br"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoFocus
            />

            <TextField
              label="Senha de acesso"
              type="password"
              placeholder="••••••••"
              value={loginSenha}
              onChange={(e) => setLoginSenha(e.target.value)}
            />

            {loginErro && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  background: 'var(--pink-soft)',
                  color: 'var(--pink-ink)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid var(--danger)',
                }}
              >
                {loginErro}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loginCarregando}
              iconRight="arrow-right"
            >
              {loginCarregando ? 'Entrando…' : 'Entrar no portal'}
            </Button>

            <div
              style={{
                marginTop: 8,
                padding: '12px 14px',
                background: 'var(--surface-sunken)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong>Conta de teste:</strong>
                <br />
                ana.ribeiro@ifpa.edu.br
              </div>
              <Button size="xs" variant="ghost" onClick={preencherContaTeste}>
                Usar esta conta
              </Button>
            </div>
          </form>
        ) : (
          /* Formulário: Criar conta */
          <form onSubmit={handleCadastroSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              label="Nome completo"
              placeholder="Como no registro acadêmico"
              value={cadNome}
              onChange={(e) => setCadNome(e.target.value)}
              autoFocus
            />

            <div>
              <div className="ar-field-label" style={{ marginBottom: 6 }}>Vínculo</div>
              <ChoiceChips
                label="Vínculo"
                options={['Aluno', 'Professor', 'Servidor']}
                value={cadVinculo}
                onChange={(v) => setCadVinculo(v)}
              />
            </div>

            <TextField
              label={cadVinculo === 'Aluno' ? 'Curso' : 'Setor ou departamento'}
              placeholder={cadVinculo === 'Aluno' ? 'Ex: Técnico em Informática' : 'Ex: Coordenação de Pesquisa'}
              value={cadCurso}
              onChange={(e) => setCadCurso(e.target.value)}
            />

            <TextField
              label="E-mail institucional"
              type="email"
              placeholder="seu.nome@ifpa.edu.br"
              value={cadEmail}
              onChange={(e) => setCadEmail(e.target.value)}
            />

            <TextField
              label="Senha de acesso"
              type="password"
              placeholder="Mínimo 8 caracteres"
              hint="Crie uma senha segura para proteger sua conta."
              value={cadSenha}
              onChange={(e) => setCadSenha(e.target.value)}
            />

            {cadErro && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  background: 'var(--pink-soft)',
                  color: 'var(--pink-ink)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid var(--danger)',
                }}
              >
                {cadErro}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={cadCarregando}
              iconRight="arrow-right"
            >
              {cadCarregando ? 'Criando conta…' : 'Criar conta e entrar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
