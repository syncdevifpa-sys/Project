import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ListPanel, ListRow } from "@/components/list-panel";
import { StatusBadge } from "@/components/status-badge";

/* Página de desenvolvimento — não linkada na navegação. Mostra todas as
   variantes do vocabulário de lista (etapa 1 da refatoração v2). */

export default function DevUi() {
  return (
    <>
      <BreadcrumbBar trilha={[{ rotulo: "Portal" }, { rotulo: "Dev · UI" }]} />

      <header className="mb-8">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight">
          Vocabulário de lista
        </h1>
        <p className="mt-1 text-[19px] text-muted-foreground">
          Variantes de ListPanel, ListRow e badges de status.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {/* badges — vocabulário completo */}
        <section>
          <p className="micro-label mb-3 px-1 text-muted-foreground">Badges de status</p>
          <div className="flex flex-wrap items-center gap-2 rounded-[16px] bg-marfim px-5 py-4">
            <StatusBadge status="fixado" />
            <StatusBadge status="novo" />
            <StatusBadge status="urgente" />
            <StatusBadge status="encerrado" />
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* variante com chevron: badges + metadado à direita */}
          <ListPanel label="Com navegação · badge e metadado">
            <ListRow
              titulo="Período de matrícula 2026/2"
              badges={<StatusBadge status="fixado" />}
              meta="Aluno"
              para="/avisos/matricula-2026-2"
            />
            <ListRow
              titulo="Cancelamento de aulas de 18/06"
              badges={<StatusBadge status="urgente" />}
              meta="Todos"
              para="/avisos/greve-servidores"
            />
            <ListRow
              titulo="Edital Nº 012/2026 — Bolsas IC"
              badges={
                <>
                  <StatusBadge status="fixado" />
                  <StatusBadge status="novo" />
                </>
              }
              meta="Aluno"
              para="/avisos/edital-012"
            />
            <ListRow
              titulo="Monitoria de Cálculo I"
              badges={<StatusBadge status="encerrado" />}
              meta="Aluno"
              para="/avisos/monitoria-calculo"
            />
          </ListPanel>

          {/* variante com metadado em segunda linha */}
          <ListPanel label="Com navegação · segunda linha">
            <ListRow
              titulo="Matrícula 2026/2 aberta"
              metaAbaixo="Hoje, 07:00 · não lida"
              para="/avisos/matricula-2026-2"
            />
            <ListRow
              titulo="Sua inscrição no Edital 012 foi recebida"
              metaAbaixo="Ontem, 14:32"
              para="/avisos/edital-012"
            />
            <ListRow
              titulo="Aulas de 18/06 canceladas"
              metaAbaixo="18/06, 09:10"
              para="/avisos/greve-servidores"
            />
          </ListPanel>

          {/* variante sem navegação: sem chevron, sem hover */}
          <ListPanel label="Sem navegação · prazos">
            <ListRow titulo="Fim da matrícula 2026/2" meta="27/06" />
            <ListRow titulo="Reposição de aula" meta="28/06" />
            <ListRow titulo="Inscrições do Edital 012" meta="30/08" />
          </ListPanel>

          {/* agrupamentos: um container por grupo, cada um com seu label */}
          <div className="flex flex-col gap-6">
            <ListPanel label="Formulários">
              <ListRow titulo="Requerimento Geral" meta="PDF" para="/documentos" />
              <ListRow titulo="Declaração de Vínculo" meta="PDF" para="/documentos" />
            </ListPanel>
            <ListPanel label="Manuais">
              <ListRow titulo="Regulamento Acadêmico 2026" meta="PDF" para="/documentos" />
              <ListRow titulo="Manual de TCC" meta="PDF" para="/documentos" />
            </ListPanel>
          </div>
        </div>
      </div>
    </>
  );
}
