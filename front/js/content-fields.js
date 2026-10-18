/* Contrato compartilhado entre formulários e validação do servidor. */
(function (root) {
    'use strict';
    const noticeFields = [
        ['tipo_publicacao', 'Tipo', { aviso: 'Aviso', noticia: 'Notícia' }],
        ['titulo', 'Título', 'text', 150],
        ['resumo', 'Resumo', 'textarea'],
        ['descricao', 'Texto completo', 'textarea'],
        [
            'categoria',
            'Categoria',
            {
                matricula: 'Matrícula',
                edital: 'Edital',
                evento: 'Evento',
                cancelamento: 'Cancelamento',
                calendario: 'Calendário'
            }
        ],
        [
            'publico_alvo',
            'Público-alvo',
            {
                todos: 'Todos',
                discente: 'Aluno',
                docente: 'Professor',
                servidor: 'Servidor',
                externo: 'Público externo'
            }
        ],
        [
            'situacao',
            'Situação',
            { publicado: 'Publicado', rascunho: 'Rascunho', arquivado: 'Arquivado' }
        ],
        ['referencia', 'Referência', 'text', 50],
        ['data_prazo', 'Prazo', 'date'],
        ['data_evento', 'Data do evento', 'date'],
        ['vagas', 'Vagas', 'number'],
        ['urgente', 'Urgente', 'checkbox'],
        ['fixado', 'Fixado', 'checkbox']
    ];

    const title = ['titulo', 'Título', 'text', 150];
    const description = ['descricao', 'Descrição', 'textarea'];
    const fields = {
        notices: {
            label: 'Publicação',
            id: 'id_aviso',
            endpoint: '/api/notices',
            defaults: {
                tipo_publicacao: 'aviso',
                categoria: 'matricula',
                publico_alvo: 'todos',
                situacao: 'publicado'
            },
            fields: noticeFields
        },
        tasks: {
            label: 'Tarefa',
            id: 'id_tarefa',
            endpoint: '/api/tasks',
            defaults: { categoria: 'Acadêmico', prioridade: 'media', status: 'aberta' },
            fields: [
                title,
                ['categoria', 'Categoria', 'text', 40],
                ['responsavel', 'Responsável', 'text', 100],
                ['data_entrega', 'Prazo de entrega', 'date'],
                ['prioridade', 'Prioridade', { baixa: 'Baixa', media: 'Média', alta: 'Alta' }],
                [
                    'status',
                    'Situação',
                    { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída' }
                ],
                ['observacao', 'Observação', 'text', 150]
            ]
        },
        documents: {
            label: 'Solicitação de documento',
            id: 'id_documento',
            endpoint: '/api/documents',
            defaults: { tipo: 'requerimento' },
            fields: [
                title,
                ['motivo', 'Motivo', 'textarea'],
                description,
                [
                    'tipo',
                    'Tipo de solicitação',
                    { pdf: 'PDF', requerimento: 'Requerimento', assinatura: 'Assinatura' }
                ]
            ]
        },
        projects: {
            label: 'Projeto',
            id: 'id_projeto',
            endpoint: '/api/projects',
            defaults: {
                eixo: 'pesquisa',
                rotulo_responsavel: 'Coordenação',
                vagas: 0,
                unidade_vaga: 'vagas',
                situacao: 'ativo'
            },
            fields: [
                title,
                description,
                [
                    'eixo',
                    'Área temática',
                    {
                        pesquisa: 'Pesquisa',
                        extensao: 'Extensão',
                        ensino: 'Ensino',
                        inovacao: 'Inovação'
                    }
                ],
                ['responsavel_nome', 'Pessoa responsável', 'text', 100],
                ['rotulo_responsavel', 'Rótulo da responsabilidade', 'text', 20],
                ['vagas', 'Vagas', 'number'],
                ['unidade_vaga', 'Unidade de vagas', 'text', 20],
                ['link', 'Link HTTP/HTTPS', 'url', 500],
                [
                    'situacao',
                    'Situação',
                    {
                        ativo: 'Ativo',
                        inscricoes: 'Inscrições',
                        em_selecao: 'Em seleção',
                        em_andamento: 'Em andamento',
                        encerrado: 'Encerrado'
                    }
                ],
                ['data_inicio', 'Data inicial', 'date'],
                ['data_fim', 'Data final', 'date']
            ]
        },
        calendar: {
            label: 'Evento',
            id: 'id_evento',
            endpoint: '/api/calendar',
            defaults: { categoria: 'evento', oculto: false, visibilidade: 'publico' },
            fields: [
                title,
                description,
                [
                    'categoria',
                    'Categoria',
                    {
                        matricula: 'Matrícula',
                        cancelamento: 'Cancelamento',
                        evento: 'Evento',
                        edital: 'Edital',
                        feriado: 'Feriado',
                        ferias: 'Férias',
                        aniversario: 'Aniversário',
                        ponto_facultativo: 'Ponto facultativo',
                        avaliacao: 'Avaliações e exames',
                        interrupcao_presencial: 'Interrupção de aulas presenciais',
                        ferias_docentes: 'Férias de docentes',
                        atividades_campus:
                            'Encontros pedagógicos, eventos acadêmicos, científicos, artístico-culturais e desportivos e outras atividades do Campus',
                        sabado_letivo: 'Sábado letivo',
                        periodo_academico: 'Início e término do período letivo',
                        culminancia_bimestral: 'Culminância bimestral',
                        recesso: 'Recesso',
                        registro_academico:
                            'Cadastro de disciplinas, notas e outras informações acadêmicas'
                    }
                ],
                ['periodo_letivo', 'Período letivo', 'text', 60],
                ['data_evento', 'Data do evento', 'date'],
                ['data_fim', 'Data final', 'date'],
                ['hora_inicio', 'Horário inicial', 'time'],
                ['hora_fim', 'Horário final', 'time'],
                ['local', 'Local', 'text', 150],
                [
                    'visibilidade',
                    'Visibilidade',
                    {
                        publico: 'Público · todos podem consultar',
                        pessoal: 'Pessoal · apenas o autor'
                    }
                ],
                ['oculto', 'Ocultar evento do calendário', 'checkbox']
            ]
        }
    };
    if (typeof module === 'object' && module.exports) module.exports = fields;
    else root.Arcadia.contentFields = fields;
})(typeof window === 'undefined' ? {} : window);
