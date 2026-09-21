import { useParams } from 'react-router-dom';
import {
  Breadcrumb,
  RecordDetailHero,
  InfoStrip,
  StepList,
  Tag,
  Button,
  useToast,
} from '@/components/arcadia';
import { getAvisos } from '@/state/storage';

export default function EditalDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const avisos = getAvisos();
  const aviso = avisos.find((a) => a.id === id) || {
    id: '3',
    titulo: 'Bolsas de Iniciação Científica',
    resumo: 'Seleção de estudantes para projetos de pesquisa do campus, com bolsa mensal por 12 meses.',
    categoria: 'edital',
    publico: 'Aluno',
    data: '30 set',
    situacao: 'Publicado',
  };

  const handleDownloadEdital = () => {
    const textContent = `EDITAL OFICIAL ARCÁDIA / IFPA\n${aviso.titulo.toUpperCase()}\n\nResumo:\n${aviso.resumo}\n\nPúblico: ${aviso.publico}\nPrazo final: ${aviso.data}\n\nDocumento emitido digitalmente pelo portal Arcádia em ${new Date().toLocaleDateString('pt-BR')}.`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edital-${aviso.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({ message: 'Edital baixado com sucesso' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Breadcrumb
        items={[
          { label: 'Avisos', href: '/avisos' },
          { label: 'Editais', href: '/avisos' },
          { label: aviso.titulo },
        ]}
      />

      <RecordDetailHero
        tone="pink"
        tags={['Edital 012/2026', aviso.publico || 'Aluno']}
        title={aviso.titulo}
        description={aviso.resumo}
        primary={{
          label: 'Inscrever-se',
          onClick: () => showToast({ message: 'Inscrição enviada para ' + aviso.titulo }),
        }}
        secondary={
          <Button variant="ghost" icon="file-text" onClick={handleDownloadEdital}>
            Baixar edital (PDF)
          </Button>
        }
        status="Inscrições abertas"
      />

      <InfoStrip
        items={[
          { icon: 'clock', label: 'Duração da bolsa', value: '12 meses' },
          { icon: 'calendar', label: 'Inscrições até', value: aviso.data || '30 set' },
          { icon: 'users', label: 'Vagas', value: '12' },
          { icon: 'graduation-cap', label: 'Público', value: aviso.publico || 'Aluno' },
        ]}
      />

      <h2 className="ar-h2">Sobre este edital</h2>
      <p className="body" style={{ margin: 0, maxWidth: 720 }}>
        O programa seleciona estudantes regularmente matriculados para atuar em projetos de pesquisa
        orientados por docentes do campus. A bolsa é mensal e exige dedicação de 20 horas semanais.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 className="ar-h2">Etapas</h2>
        <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
          <Tag>4 etapas</Tag>
          <Tag>2 documentos</Tag>
        </div>
      </div>

      <StepList
        steps={[
          {
            title: 'Inscrição pelo portal',
            description: 'Envie o formulário e o histórico escolar em PDF.',
            when: 'até 30 set',
          },
          {
            title: 'Análise de currículo',
            description: 'Banca da coordenação de pesquisa avalia os documentos.',
            when: '01 a 08 out',
          },
          {
            title: 'Resultado preliminar',
            description: 'Publicado em Avisos, com prazo de recurso de 48h.',
            when: '10 out',
          },
        ]}
      />
    </div>
  );
}
