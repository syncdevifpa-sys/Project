import { useId } from "react";
import { Link } from "react-router-dom";
import { useAnunciar } from "@/state/announce";
import { useDemo } from "@/state/demo";
import { CategoriaBadge, TipoDocumentoBadge } from "@/components/status-badge";
import { Metrica } from "@/components/Metrica";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronRightIcon,
  DownloadIcon,
  MailIcon,
  ExternalLinkIcon,
  Lock,
  InboxIcon,
  AlertOctagonIcon,
  SearchIcon,
  LogOutIcon,
} from "lucide-react";

type Vinculo = "aluno" | "professor" | "servidor" | "todos";

const vinculoOptions: { value: Vinculo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "aluno", label: "Aluno" },
  { value: "professor", label: "Professor" },
  { value: "servidor", label: "Servidor" },
];

function CardAviso({
  aviso,
  destacado,
}: {
  aviso: Aviso;
  destacado?: boolean;
}) {
  const id = useId();
  const data = new Date(aviso.data);
  const dataFormatada = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <article
      className={cn(
        "flex min-h-0 w-full flex-col gap-3 rounded-[2rem] bg-card p-6 text-left shadow-none transition-colors duration-150 hover:bg-card-subtle",
        destacado && "ring-2 ring-lilas/40"
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <CategoriaBadge variante={aviso.categoria} className="shrink-0" />
        <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {dataFormatada}
        </time>
      </header>

      <h3 className="text-base leading-snug font-semibold text-foreground">
        {aviso.titulo}
      </h3>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {aviso.resumo}
      </p>

      <footer className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{aviso.vinculoLabel}</span>
        <span className="text-foreground">·</span>
        <Link
          href={`/aviso/${aviso.id}`}
          className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
        >
          Ler publicação
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </footer>
    </article>
  );
}

function CardDocumento({
  documento,
}: {
  documento: Documento;
}) {
  const acessoLabel =
    documento.acessos > 1 ? "acessos" : "acesso";

  return (
    <article
      className="flex min-h-0 w-full flex-col gap-3 rounded-[2rem] bg-card p-6 text-left shadow-none transition-colors duration-150 hover:bg-card-subtle"
    >
      <header className="flex items-start justify-between gap-4">
        <TipoDocumentoBadge
          tipo={documento.tipo}
          className="shrink-0"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {documento.acessos} {acessoLabel}
        </span>
      </header>

      <h3 className="text-base leading-snug font-semibold text-foreground">
        {documento.titulo}
      </h3>

      <footer className="flex items-center gap-2">
        {documento.tipo === "PDF" && (
          <Link
            href={`/baixar/${documento.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-matricula/10 px-4 py-1.5 text-xs font-medium text-matricula hover:bg-matricula/20"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Baixar
          </Link>
        )}
        {documento.tipo === "E-mail" && (
          <Link
            href={`/enviar-email/${documento.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-calendario/10 px-4 py-1.5 text-xs font-medium text-calendario hover:bg-calendario/20"
          >
            <MailIcon className="h-3.5 w-3.5" />
            Abrir
          </Link>
        )}
        {documento.tipo === "Link" && (
          <Link
            href={`/acessar/${documento.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-evento/10 px-4 py-1.5 text-xs font-medium text-evento hover:bg-evento/20"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            Acessar
          </Link>
        )}
      </footer>
    </article>
  );
}

function EstadoBloqueado({
  tentarNovamente,
}: {
  tentarNovamente: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-8">
      <Lock className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-left">
        Seu acesso está temporariamente bloqueado.
      </p>
      <button
        onClick={tentarNovamente}
        className="inline-flex items-center gap-1 rounded-full bg-destructive px-4 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-8">
      <InboxIcon className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-left">
        Não há publicações para exibir.
      </p>
    </div>
  );
}

function EstadoErro({
  tentarNovamente,
}: {
  tentarNovamente: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-8">
      <AlertOctagonIcon className="h-10 w-10 text-destructive" />
      <p className="text-sm text-destructive text-left">
        Não foi possível carregar as publicações.
      </p>
      <button
        onClick={tentarNovamente}
        className="inline-flex items-center gap-1 rounded-full bg-destructive px-4 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function Inicio() {
  const { dados, filtroVinculo, setFiltroVinculo, busca, setBusca } =
    useAnunciar();
  const { simular } = useDemo();

  const categoriasComContagem = (() => {
    const map = new Map<string, number>();
    for (const aviso of Array.isArray(dados) ? dados : []) {
      const key = aviso.categoria;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([categoria, count]) => ({
      categoria,
      count,
    }));
  })();

  return (
    <div className="flex min-h-screen flex-col bg-creme">
      {/* Hero Section — alinhado à esquerda, max-width no texto */}
      <section className="flex w-full flex-col px-6 py-10 sm:px-10 lg:px-16">
        <div className="max-w-3xl">
          <h1 className="text-display font-bold leading-none text-tinta">
            Tudo que a secretaria publica, em um só lugar.
          </h1>
          <p className="mt-4 text-body-lg text-muted-foreground">
            Acompanhe avisos de matrícula, editais, eventos, calendário e
            documentos sem sair da plataforma.
          </p>
        </div>
      </section>

      {/* Filtros e busca — alinhados à esquerda */}
      <section className="flex w-full flex-col gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center gap-3">
          {vinculoOptions.map((op) => (
            <button
              key={op.value}
              onClick={() => setFiltroVinculo(op.value)}
              className={cn(
                "rounded-full border border-border bg-transparent px-4 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                filtroVinculo === op.value
                  ? "border-foreground/30 bg-foreground text-canvas"
                  : "text-foreground"
              )}
            >
              {op.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aviso, documento..."
            className="h-10 w-full rounded-full border border-border bg-card px-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      {/* Mural de hoje — grid de cards alinhados à esquerda */}
      <section className="flex w-full flex-col gap-6 px-6 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <h2 className="text-heading text-tinta">Mural de hoje</h2>
          <div className="flex flex-wrap gap-2">
            {categoriasComContagem.map(({ categoria, count }) => (
              <span
                key={categoria}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {categoria === "matricula" && "Matrícula" ||
                 categoria === "edital" && "Edital" ||
                 categoria === "evento" && "Evento" ||
                 categoria === "cancelamento" && "Cancelamento" ||
                 categoria === "calendario" && "Calendário" ||
                 categoria === "documento" && "Documento"}{" "}
                ({count})
              </span>
            ))}
          </div>
        </div>

        {dados === "carregando" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-[2rem]" />
            ))}
          </div>
        )}

        {dados === "erro" && <EstadoErro tentarNovamente={simular} />}

        {dados === "vazio" && <EstadoVazio />}

        {Array.isArray(dados) && dados.length === 0 && <EstadoVazio />}

        {Array.isArray(dados) && dados.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dados
              .filter((aviso) => {
                if (filtroVinculo === "todos") return true;
                return aviso.vinculo === filtroVinculo;
              })
              .filter((aviso) => {
                if (!busca) return true;
                const termo = busca.toLowerCase();
                return (
                  aviso.titulo.toLowerCase().includes(termo) ||
                  aviso.resumo.toLowerCase().includes(termo)
                );
              })
              .map((aviso) => (
                <CardAviso key={aviso.id} aviso={aviso} />
              ))}
          </div>
        )}
      </section>

      {/* O semestre em números — alinhado à esquerda */}
      <section className="flex w-full flex-col gap-6 px-6 py-8 sm:px-10 lg:px-16">
        <h2 className="text-heading text-tinta">O semestre em números</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metrica valor="1.284" rotulo="Alunos que visam" />
          <Metrica valor="92%" rotulo="Vagas preenchidas" />
          <Metrica valor="4" rotulo="Novos cursos" />
        </div>
      </section>

      {/* Publicações recentes — cards alinhados à esquerda */}
      <section className="flex w-full flex-col gap-6 px-6 py-8 sm:px-10 lg:px-16">
        <h2 className="text-heading text-tinta">Publicações recentes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avisosSecundarios.map((aviso) => (
            <CardAviso key={aviso.id} aviso={aviso} />
          ))}
        </div>
      </section>

      {/* Central de documentos — alinhado à esquerda */}
      <section className="flex w-full flex-col gap-6 px-6 py-8 sm:px-10 lg:px-16">
        <h2 className="text-heading text-tinta">
          O que você precisa baixar
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documentos.map((doc) => (
            <CardDocumento key={doc.id} documento={doc} />
          ))}
        </div>
      </section>

      {/* Rodapé — alinhado à esquerda */}
      <footer className="mt-auto flex w-full flex-col gap-4 border-t border-border bg-papel px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              Vínculos úteis
            </span>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/secretaria"
                className="text-link-azul underline-offset-2 hover:text-link-azul/80"
              >
                Secretaria acadêmica
              </Link>
              <Link
                href="/biblioteca"
                className="text-link-azul underline-offset-2 hover:text-link-azul/80"
              >
                Biblioteca
              </Link>
              <Link
                href="/calendario"
                className="text-link-azul underline-offset-2 hover:text-link-azul/80"
              >
                Calendário
              </Link>
              <Link
                href="/contato"
                className="text-link-azul underline-offset-2 hover:text-link-azul/80"
              >
                Contato
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>secretaria@arcadia.edu.br</span>
            <span>IFPA — Campus Belém</span>
            <span>© 2026 Arcádia. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      <form
        action="/logout"
        method="post"
        className="fixed bottom-0 right-0 z-50 m-4 flex h-10 w-10 items-center justify-end"
      >
        <button
          type="submit"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-secondary"
          aria-label="Sair"
        >
          <LogOutIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

export default Inicio;
