import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav, type TopNavItem } from '@/components/arcadia/top-nav';
import { useCommandPalette } from '@/components/arcadia/command-palette';
import {
  getUsuarioSessao,
  getAvisos,
  getTarefas,
  getDocumentos,
  getEventosCalendario,
  getPessoas,
  getProjetos,
  encerrarSessao,
  subscribeToDataChanges,
} from '@/state/storage';

import { AuthModal } from '@/components/arcadia';

export function AppShell() {
  const [usuario, setUsuario] = useState(getUsuarioSessao);
  const [contadores, setContadores] = useState(() => ({
    avisos: getAvisos().length,
    tarefas: getTarefas().length,
    documentos: getDocumentos().length,
    calendario: getEventosCalendario().length,
    pessoas: getPessoas().length,
    projetos: getProjetos().length,
  }));

  const { openWithScope } = useCommandPalette();

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setUsuario(getUsuarioSessao());
      setContadores({
        avisos: getAvisos().length,
        tarefas: getTarefas().length,
        documentos: getDocumentos().length,
        calendario: getEventosCalendario().length,
        pessoas: getPessoas().length,
        projetos: getProjetos().length,
      });
    });
    return unsubscribe;
  }, []);

  if (!usuario) {
    return <AuthModal onSuccess={(u) => setUsuario(u || getUsuarioSessao())} />;
  }

  const navItems: TopNavItem[] = [
    { label: 'Painel', href: '/' },
    { label: 'Avisos', count: contadores.avisos, href: '/avisos' },
    { label: 'Tarefas', count: contadores.tarefas, href: '/tarefas' },
    { label: 'Documentos', count: contadores.documentos, href: '/documentos' },
    { label: 'Calendário', count: contadores.calendario, href: '/calendario' },
    { separator: true },
    { label: 'Pessoas', count: contadores.pessoas, href: '/pessoas' },
    { label: 'Projetos', count: contadores.projetos, href: '/projetos' },
  ];

  const roleFormatted = usuario.vinculo
    ? usuario.vinculo.charAt(0).toUpperCase() + usuario.vinculo.slice(1).toLowerCase()
    : 'Aluno';

  return (
    <div className="ar-app">
      <TopNav
        items={navItems}
        user={{
          name: usuario.nome || 'Ana Ribeiro',
          role: roleFormatted,
        }}
        brand={{
          name: 'Arcádia',
          sub: 'IFPA CAMPUS BELÉM',
          logoSrc: '/arcadia-logo-128.png',
          tone: 'lime',
        }}
        homeHref="/"
        settingsHref="/configuracoes"
        onSearch={() => openWithScope('Tudo')}
        onSignOut={encerrarSessao}
      />
      <main id="conteudo" style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
