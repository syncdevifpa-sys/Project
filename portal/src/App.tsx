import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { PaletteProvider } from "@/components/command-palette";
import Inicio from "@/pages/inicio";
import EmConstrucao from "@/pages/em-construcao";
import DevUi from "@/pages/dev-ui";
import { AnnounceProvider } from "@/state/announce";
import { DemoProvider } from "@/state/demo";

export default function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <AnnounceProvider>
          <TooltipProvider delayDuration={200}>
            <PaletteProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Inicio />} />
                  <Route path="avisos" element={<EmConstrucao titulo="Avisos" escopoBusca="avisos" />} />
                  <Route path="avisos/:id" element={<EmConstrucao titulo="Aviso" />} />
                  <Route path="documentos" element={<EmConstrucao titulo="Documentos" escopoBusca="documentos" />} />
                  <Route path="projetos" element={<EmConstrucao titulo="Projetos" />} />
                  <Route path="calendario" element={<EmConstrucao titulo="Calendário" />} />
                  <Route path="perfil" element={<EmConstrucao titulo="Perfil" />} />
                  <Route path="dev/ui" element={<DevUi />} />
                </Route>
              </Routes>
            </PaletteProvider>
          </TooltipProvider>
        </AnnounceProvider>
      </DemoProvider>
    </BrowserRouter>
  );
}
