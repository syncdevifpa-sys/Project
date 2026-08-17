import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarConteudo } from "@/components/app-sidebar";
import { VinculoBanner } from "@/components/vinculo-banner";
import { cn } from "@/lib/utils";

const CHAVE_COLAPSO = "arcadia.portal.sidebar-colapsada";

export function AppShell() {
  const [colapsada, setColapsada] = useState(() => {
    if (new URLSearchParams(window.location.search).get("colapsada") === "1") return true;
    return localStorage.getItem(CHAVE_COLAPSO) === "1";
  });
  const [drawerAberto, setDrawerAberto] = useState(false);

  useEffect(() => {
    localStorage.setItem(CHAVE_COLAPSO, colapsada ? "1" : "0");
  }, [colapsada]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      {/* sidebar flutuante — desktop */}
      <aside
        className={cn(
          "fixed inset-y-3 left-3 z-30 hidden overflow-hidden rounded-[20px] transition-[width] duration-200 md:block",
          colapsada ? "w-16" : "w-[264px]",
        )}
      >
        <SidebarConteudo
          colapsada={colapsada}
          onAlternar={() => setColapsada((v) => !v)}
        />
      </aside>

      {/* topo — mobile */}
      <header className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="text-[19px] font-bold tracking-tight">Arcádia</span>
        <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir navegação"
              className="flex size-10 items-center justify-center rounded-full bg-card"
            >
              <Menu aria-hidden className="size-5" strokeWidth={1.6} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] border-none bg-sidebar p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegação</SheetTitle>
              <SheetDescription>Menu principal do portal</SheetDescription>
            </SheetHeader>
            <div onClick={(e) => {
              // fecha o drawer ao navegar por qualquer link
              if ((e.target as HTMLElement).closest("a")) setDrawerAberto(false);
            }}>
              <SidebarConteudo />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* conteúdo */}
      <main
        id="conteudo"
        className={cn(
          "px-4 pt-2 pb-16 transition-[padding] duration-200 md:pt-10",
          colapsada ? "md:pl-[104px]" : "md:pl-[304px]",
          "md:pr-10",
        )}
      >
        <div className="mx-auto w-full max-w-[1080px]">
          <VinculoBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
