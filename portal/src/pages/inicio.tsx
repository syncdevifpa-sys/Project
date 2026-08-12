import { useState } from "react";
import { Link } from "react-router-dom";
import { BellOff, Inbox, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { OnboardingPills } from "@/components/onboarding-pills";
import { NOTIFICACOES, RESUMO_DIARIO, USUARIO_PADRAO } from "@/mock-data";
import { useAnunciar } from "@/state/announce";
import { useDemo } from "@/state/demo";

/* ---------- blocos de estado reutilizados ---------- */

function EstadoVazio({
  icone: Icone,
  frase,
  acao,
}: {
  icone: typeof Inbox;
  frase: string;
  acao: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Icone aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.4} />
      <p className="text-[14px] text-muted-foreground">{frase}</p>
      {acao}
    </div>
  );
}

function EstadoErro({ frase, aoTentar }: { frase: string; aoTentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="text-[14px] text-muted-foreground">{frase}</p>
      <Button variant="outline" onClick={aoTentar}>
        <RefreshCw aria-hidden /> Tentar novamente
      </Button>
    </div>
  );
}

function EstadoBloqueado({ explicacao }: { explicacao: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Lock aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.4} />
      <p className="max-w-[36ch] text-[14px] text-muted-foreground">{explicacao}</p>
    </div>
  );
}

/* ---------- página ---------- */

export default function Inicio() {
  const { dados, setDados, vinculo } = useDemo();
  const anunciar = useAnunciar();
  const [pendentesOnboarding, setPendentesOnboarding] = useState(0);

  const usuario = USUARIO_PADRAO;
  const primeiroNome = usuario.nome.split(" ")[0];

  const naoLidas = dados === "normal" ? NOTIFICACOES.filter((n) => n.meta.includes("não lida")).length : 0;
  const atencao = pendentesOnboarding + naoLidas;

  const tentarNovamente = () => {
    setDados("normal");
    anunciar("Avisos recarregados.");
  };

  const bloqueadoGeral = vinculo === "recusado";

  return (
    <>
      <BreadcrumbBar trilha={[{ rotulo: "Portal" }, { rotulo: "Início" }]} />

      <header className="mb-8">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight md:text-[48px]">
          Bem-vinda, {primeiroNome}
        </h1>
        {atencao > 0 && dados === "normal" && !bloqueadoGeral && (
          <p className="mt-1 text-[19px] text-muted-foreground">
            {atencao} {atencao === 1 ? "item precisa" : "itens precisam"} da sua atenção hoje.
          </p>
        )}
      </header>

      <OnboardingPills onPendentes={setPendentesOnboarding} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* caixa de avisos */}
        <section
          aria-labelledby="titulo-caixa"
          className="rounded-3xl bg-card p-7 md:p-9"
        >
          <p className="micro-label mb-3 text-muted-foreground">Notificações</p>
          <h2 id="titulo-caixa" className="mb-6 text-[22px] font-bold tracking-tight">
            Caixa de avisos
          </h2>

          {bloqueadoGeral ? (
            <EstadoBloqueado explicacao="Disponível após a correção do vínculo. Fale com a secretaria acadêmica." />
          ) : dados === "carregando" ? (
            <div className="flex flex-col gap-2.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[72px] rounded-2xl bg-muted" />
              ))}
            </div>
          ) : dados === "erro" ? (
            <EstadoErro
              frase="Não conseguimos carregar seus avisos."
              aoTentar={tentarNovamente}
            />
          ) : dados === "vazio" ? (
            <EstadoVazio
              icone={Inbox}
              frase="Nenhuma notificação por aqui."
              acao={
                <Button variant="outline" asChild>
                  <Link to="/avisos">Ver todos os avisos</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {NOTIFICACOES.map((n) => {
                  const conteudo = (
                    <>
                      <strong className="block text-[14.5px] font-semibold">
                        {n.titulo}
                      </strong>
                      <span className="text-[12.5px] text-muted-foreground">{n.meta}</span>
                    </>
                  );
                  return (
                    <li key={n.id}>
                      {n.avisoId ? (
                        <Link
                          to={`/avisos/${n.avisoId}`}
                          className="block rounded-2xl bg-marfim px-5 py-4 transition-colors hover:bg-background"
                        >
                          {conteudo}
                        </Link>
                      ) : (
                        <div className="rounded-2xl bg-marfim px-5 py-4">{conteudo}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-[12.5px] text-muted-foreground">
                Cancelamento e matrícula chegam sempre, independentemente das preferências.
              </p>
            </>
          )}
        </section>

        {/* resumo diário — painel de contexto (lilás) */}
        <section
          aria-labelledby="titulo-resumo"
          className="rounded-3xl bg-lilas p-7 md:p-9"
        >
          <p className="micro-label mb-3 text-violeta">Resumo diário</p>
          <h2 id="titulo-resumo" className="mb-6 text-[22px] font-bold tracking-tight">
            O e-mail das 7h
          </h2>

          {bloqueadoGeral || vinculo === "verificacao" ? (
            <EstadoBloqueado explicacao="Disponível após a verificação do vínculo." />
          ) : dados === "carregando" ? (
            <Skeleton className="h-[260px] rounded-2xl bg-violeta/10" aria-hidden />
          ) : dados === "erro" ? (
            <EstadoErro
              frase="Não conseguimos carregar o resumo de hoje."
              aoTentar={tentarNovamente}
            />
          ) : dados === "vazio" ? (
            <EstadoVazio
              icone={BellOff}
              frase="O resumo de hoje ainda não chegou."
              acao={
                <Button variant="outline" asChild>
                  <Link to="/perfil">Ativar resumo diário</Link>
                </Button>
              }
            />
          ) : (
            <div className="rounded-2xl bg-marfim p-6">
              <p className="micro-label text-violeta">{RESUMO_DIARIO.origem}</p>
              <strong className="mt-3 mb-4 block text-[15.5px] font-bold">
                {RESUMO_DIARIO.titulo}
              </strong>
              <ul className="mb-6 flex flex-col gap-2">
                {RESUMO_DIARIO.itens.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl bg-card px-4 py-3 text-[13.5px]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link to="/avisos">Abrir o mural</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
