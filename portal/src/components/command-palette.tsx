import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FileText, FolderOpen, Search, X } from "lucide-react";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AVISOS,
  DOCUMENTOS,
  PROJETOS,
  ROTULO_CATEGORIA,
} from "@/mock-data";

export type EscopoBusca = "tudo" | "avisos" | "documentos" | "projetos";

interface ItemBusca {
  id: string;
  tipo: "aviso" | "documento" | "projeto";
  titulo: string;
  secundaria: string;
  corpo: string;
  href: string;
}

const ITENS: ItemBusca[] = [
  ...AVISOS.map((a) => ({
    id: `aviso-${a.id}`,
    tipo: "aviso" as const,
    titulo: a.titulo,
    secundaria: `${ROTULO_CATEGORIA[a.categoria]} · ${a.data.slice(8, 10)}/${a.data.slice(5, 7)}`,
    corpo: a.resumo,
    href: `/avisos/${a.id}`,
  })),
  ...DOCUMENTOS.map((d) => ({
    id: `doc-${d.id}`,
    tipo: "documento" as const,
    titulo: d.titulo,
    secundaria: d.tipo,
    corpo: `${d.acessos} acessos neste semestre.`,
    href: "/documentos",
  })),
  ...PROJETOS.map((p) => ({
    id: `proj-${p.id}`,
    tipo: "projeto" as const,
    titulo: p.titulo,
    secundaria: p.autoria,
    corpo: p.detalhe,
    href: "/projetos",
  })),
];

const ICONE = { aviso: Bell, documento: FileText, projeto: FolderOpen };
const GRUPO = { aviso: "Avisos", documento: "Documentos", projeto: "Projetos" };
const SUGESTOES = ["matrícula", "edital 012", "requerimento"];

interface PaletteContexto {
  abrir: (escopo?: EscopoBusca) => void;
}

const Ctx = createContext<PaletteContexto | null>(null);

export function usePalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePalette precisa do PaletteProvider");
  return ctx;
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const [escopo, setEscopo] = useState<EscopoBusca>("tudo");
  const [busca, setBusca] = useState("");
  const [destacado, setDestacado] = useState("");
  const navigate = useNavigate();

  const abrir = useCallback((novoEscopo: EscopoBusca = "tudo") => {
    setEscopo(novoEscopo);
    setBusca("");
    setAberta(true);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("palette") === "1") {
      setAberta(true);
    }
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((v) => !v);
        setBusca("");
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const visiveis = useMemo(
    () =>
      escopo === "tudo"
        ? ITENS
        : ITENS.filter((i) => `${i.tipo}s` === escopo),
    [escopo],
  );

  const itemDestacado = ITENS.find((i) => i.id === destacado) ?? null;

  const abrirItem = (item: ItemBusca) => {
    setAberta(false);
    navigate(item.href);
  };

  return (
    <Ctx.Provider value={{ abrir }}>
      {children}
      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent
          className="top-[10%] w-[min(880px,calc(100vw-32px))] max-w-none translate-y-0 gap-0 overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Busca global</DialogTitle>
            <DialogDescription>
              Busque avisos, documentos e projetos. Navegue com as setas e abra com Enter.
            </DialogDescription>
          </DialogHeader>

          <Command
            value={destacado}
            onValueChange={setDestacado}
            className="flex h-[440px] flex-col outline-none"
          >
            {/* campo de busca */}
            <div className="flex items-center gap-3 border-b border-border px-5">
              <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={busca}
                onValueChange={setBusca}
                autoFocus
                placeholder="Buscar aviso, documento ou projeto…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  aria-label="Limpar busca"
                  className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>

            {/* escopos: tabs de verdade — um painel por vez */}
            <Tabs
              value={escopo}
              onValueChange={(v) => setEscopo(v as EscopoBusca)}
              className="min-h-0 flex-1 gap-0"
            >
              <div className="border-b border-border px-5 py-2.5">
                <TabsList>
                  <TabsTrigger value="tudo">Tudo</TabsTrigger>
                  <TabsTrigger value="avisos">Avisos</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                  <TabsTrigger value="projetos">Projetos</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={escopo} className="min-h-0 flex-1">
                <div className="grid h-full grid-cols-1 md:grid-cols-[1.2fr_1fr]">
                  {/* resultados */}
                  <Command.List className="max-h-full overflow-y-auto p-2">
                    <Command.Empty className="px-4 py-8 text-center text-[14px] text-muted-foreground">
                      <p>
                        Nenhum resultado para <strong>"{busca}"</strong>.
                      </p>
                      <p className="micro-label mt-5 mb-2">Tente buscar por</p>
                      <span className="flex flex-wrap justify-center gap-2">
                        {SUGESTOES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setBusca(s)}
                            className="rounded-full bg-muted px-3 py-1 text-[13px] text-foreground transition-colors hover:bg-border"
                          >
                            {s}
                          </button>
                        ))}
                      </span>
                    </Command.Empty>

                    {(["aviso", "documento", "projeto"] as const).map((tipo) => {
                      const doTipo = visiveis.filter((i) => i.tipo === tipo);
                      if (doTipo.length === 0) return null;
                      return (
                        <Command.Group
                          key={tipo}
                          heading={GRUPO[tipo]}
                          className="[&_[cmdk-group-heading]]:micro-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-muted-foreground"
                        >
                          {doTipo.map((item) => {
                            const Icone = ICONE[item.tipo];
                            return (
                              <Command.Item
                                key={item.id}
                                value={item.id}
                                keywords={[item.titulo, item.secundaria, item.corpo]}
                                onSelect={() => abrirItem(item)}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                                  "data-[selected=true]:bg-muted",
                                )}
                              >
                                <Icone
                                  aria-hidden
                                  className="size-4 shrink-0 text-muted-foreground"
                                  strokeWidth={1.6}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-medium">
                                    {item.titulo}
                                  </span>
                                  <span className="block text-[12.5px] text-muted-foreground">
                                    {item.secundaria}
                                  </span>
                                </span>
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      );
                    })}
                  </Command.List>

                  {/* preview do item destacado */}
                  <aside
                    aria-label="Prévia do resultado selecionado"
                    className="hidden border-l border-border bg-lilas/60 p-6 md:block"
                  >
                    {itemDestacado ? (
                      <>
                        <p className="micro-label text-violeta">
                          {GRUPO[itemDestacado.tipo]}
                        </p>
                        <h3 className="mt-3 text-[17px] leading-snug font-bold">
                          {itemDestacado.titulo}
                        </h3>
                        <p className="mt-1.5 text-[13px] text-muted-foreground">
                          {itemDestacado.secundaria}
                        </p>
                        <p className="mt-4 text-[14px] leading-relaxed">
                          {itemDestacado.corpo}
                        </p>
                        <p className="micro-label mt-6 text-muted-foreground">
                          Enter para abrir
                        </p>
                      </>
                    ) : (
                      <p className="text-[14px] text-muted-foreground">
                        Navegue pelos resultados para ver a prévia.
                      </p>
                    )}
                  </aside>
                </div>
              </TabsContent>
            </Tabs>
          </Command>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

/* Campo de busca visível que delega tudo ao command palette:
   ao receber foco, abre o modal já no escopo certo. */
export function CampoBuscaDelegado({
  escopo,
  placeholder,
}: {
  escopo: EscopoBusca;
  placeholder: string;
}) {
  const { abrir } = usePalette();
  return (
    <button
      type="button"
      onClick={() => abrir(escopo)}
      onFocus={(e) => {
        // abre apenas em foco via teclado; clique já abre no onClick
        if (e.currentTarget.matches(":focus-visible")) abrir(escopo);
      }}
      className="flex w-full items-center gap-3 rounded-full bg-card px-6 py-4 text-left text-[14.5px] text-muted-foreground transition-colors hover:bg-muted"
    >
      <Search aria-hidden className="size-4" />
      {placeholder}
      <kbd className="micro-label ml-auto rounded-md bg-background px-2 py-1">⌘K</kbd>
    </button>
  );
}
