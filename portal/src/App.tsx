import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { CommandPaletteProvider } from '@/components/arcadia/command-palette';
import { ToastProvider } from '@/components/arcadia/toast';
import Painel from '@/pages/painel';
import Avisos from '@/pages/avisos';
import EditalDetail from '@/pages/edital-detail';
import Tarefas from '@/pages/tarefas';
import Documentos from '@/pages/documentos';
import Calendario from '@/pages/calendario';
import Pessoas from '@/pages/pessoas';
import Projetos from '@/pages/projetos';
import Configuracoes from '@/pages/configuracoes';

export default function App() {
  const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');
  const basename = isPortal ? '/portal' : '';

  return (
    <BrowserRouter basename={basename}>
      <CommandPaletteProvider>
        <ToastProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Painel />} />
              <Route path="painel" element={<Painel />} />
              <Route path="avisos" element={<Avisos />} />
              <Route path="avisos/:id" element={<EditalDetail />} />
              <Route path="tarefas" element={<Tarefas />} />
              <Route path="documentos" element={<Documentos />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="pessoas" element={<Pessoas />} />
              <Route path="projetos" element={<Projetos />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="perfil" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </CommandPaletteProvider>
    </BrowserRouter>
  );
}
