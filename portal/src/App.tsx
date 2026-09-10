import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { PaletteProvider } from "@/components/command-palette";
import Inicio from "@/pages/inicio";
import Painel from "@/pages/painel";
import Avisos from "@/pages/avisos";
import Tarefas from "@/pages/tarefas";
import Documentos from "@/pages/documentos";
import Calendario from "@/pages/calendario";
import Pessoas from "@/pages/pessoas";
import Projetos from "@/pages/projetos";
import EmConstrucao from "@/pages/em-construcao";
import DevUi from "@/pages/dev-ui";
import { AnnounceProvider } from "@/state/announce";
import { DemoProvider } from "@/state/demo";

export default function App() {
  const isPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/portal");
  const basename = isPortal ? "/portal" : "";

  return (
    <BrowserRouter basename={basename}>
      <DemoProvider>
        <AnnounceProvider>
          <TooltipProvider delayDuration={200}>
            <PaletteProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Painel />} />
                  <Route path="painel" element={<Painel />} />
                  <Route path="inicio-legado" element={<Inicio />} />
                  <Route path="avisos" element={<Avisos />} />
                  <Route path="avisos/:id" element={<Avisos />} />
                  <Route path="tarefas" element={<Tarefas />} />
                  <Route path="documentos" element={<Documentos />} />
                  <Route path="calendario" element={<Calendario />} />
                  <Route path="pessoas" element={<Pessoas />} />
                  <Route path="projetos" element={<Projetos />} />
                  <Route path="perfil" element={<EmConstrucao titulo="Perfil" />} />
                  <Route path="dev/ui" element={<DevUi />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </PaletteProvider>
          </TooltipProvider>
        </AnnounceProvider>
      </DemoProvider>
    </BrowserRouter>
  );
}
