import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AppShell() {
  const [drawerAberto, setDrawerAberto] = useState(false);

  return (
    <div className="min-h-screen bg-[#090b10] p-3 md:p-5 text-white font-sans antialiased selection:bg-[#bef264] selection:text-black">
      {/* Topo Mobile */}
      <header className="mb-3 flex items-center justify-between rounded-[18px] border-[1.5px] border-[#2e3646] bg-[#121620] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full border border-black bg-[#d8d1ff] text-xs font-bold text-black">
            A
          </span>
          <span className="text-base font-extrabold tracking-tight text-white">Arcádia</span>
        </div>

        <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu"
              className="flex size-9 items-center justify-center rounded-full border border-[#2e3646] bg-[#181e2b] text-white"
            >
              <Menu className="size-4" strokeWidth={2} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-2 bg-[#090b10] border-r border-[#2e3646]">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegação</SheetTitle>
              <SheetDescription>Menu do portal</SheetDescription>
            </SheetHeader>
            <div
              className="h-full"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setDrawerAberto(false);
              }}
            >
              <AppSidebar />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Grid Principal: Sidebar + Conteúdo */}
      <div className="mx-auto flex w-full max-w-[1360px] items-start gap-4">
        {/* Sidebar Desktop Fixa */}
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-[260px] shrink-0 md:block">
          <AppSidebar />
        </aside>

        {/* Painel Principal */}
        <main
          id="conteudo"
          className="min-h-[calc(100vh-2.5rem)] flex-1 rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#121620] p-5 md:p-8 shadow-2xl relative text-white"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
