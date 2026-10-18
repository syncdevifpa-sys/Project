# Calendário: feriados anuais, legenda e formulário

Conferência em 18/10/2026. Alterações locais na branch codex/fix-auth-calendar.

## Comportamento

- Feriados são calculados ao consultar o calendário, sem criar cópias no banco. Ano configurável de 2024 a 2099; o modo mensal acompanha o ano navegado.
- Abrangências: Brasil (10 datas), Brasil e Pará (11), Brasil, Pará e Belém (13). A seleção regional vale para a consulta atual.
- Sexta-feira da Paixão e Corpus Christi usam cálculo da Páscoa, não a mesma data numérica todos os anos. Corpus Christi entra somente na abrangência Belém, como feriado municipal; no calendário federal é ponto facultativo.
- Datas importadas são preservadas. A comparação por data e categoria ou nome equivalente evita duplicação, inclusive Dia do Trabalhador, Consciência Negra e Imaculada Conceição.
- Feriados automáticos não oferecem edição, seleção para exclusão ou exclusão. Eventos cadastrados continuam com as permissões existentes.
- Carnaval, Recírio, vésperas, férias e atividades acadêmicas continuam seguindo o calendário aprovado do IFPA. Não se presume repetição de suas datas.
- Legenda com cores personalizadas, nomes visíveis e amostra imediata da categoria no formulário de criação/edição. Feriados usam vermelho e férias/recesso usam laranja por padrão; preferências de cores já salvas são preservadas.
- Incluído filtro de feriados, antes ausente. Nomes extensos foram abreviados nos filtros; os textos completos permanecem no formulário e nas informações da legenda.

## Comparação com o IFPA

Documento local: Resoluo*n_1591.2025*-\_Calendrio_2026_campus_Belm.pdf, educação básica, páginas 2 a 4. SHA-256: 0d7667db7333599e9e8aefa16ed7712bf40a31dc2895fc3c01104c6c5526b17a.

| Datas em 2026                                   | Conferência no PDF |
| ----------------------------------------------- | ------------------ |
| 01/01, 03/04, 21/04, 01/05, 04/06               | Página 2           |
| 15/08, 07/09, 12/10, 02/11, 15/11, 20/11, 08/12 | Página 3           |
| 25/12                                           | Página 4           |

As 13 datas foram conferidas com os candidatos extraídos do PDF. O teste automatizado também confirma ausência de novas cópias automáticas quando esse calendário está carregado. Isso não afirma exatidão de todos os demais eventos do importador.

## Fontes oficiais

- Feriados fixos: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm
- Nossa Senhora Aparecida: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm
- Consciência Negra: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm
- Calendário federal 2026 e distinção de pontos facultativos: https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026
- Adesão do Pará: https://alepa.pa.gov.br/Comunicacao/Noticia/8982
- Feriados religiosos de Belém, incluindo Corpus Christi e 08/12, Lei municipal 6.306/1967: https://licitacao.infraero.gov.br/arquivos_licitacao/2012/SRSP/012_ADSP-4_SRSP_2012_PG-e/Recurso%20Paleta%20Manual%20Feriado-08-03.pdf
- Diário municipal preservado em órgão federal, com 08/12: https://www.gov.br/ans/pt-br/assuntos/noticias/periodo-eleitoral/ponto-facultativo-em-belem-pa/dom_140222FeriadosePontosFacultativosde2022.pdf

As regras refletem as fontes consultadas; mudanças futuras de legislação exigem manutenção. Não há consulta de rede em tempo de uso.

## Validação e limites

Testes cobrem anos diferentes, datas móveis, abrangência, duplicidades, comparação com o PDF real e retorno de cor ao alterar categoria com preferência personalizada. Build estático executado. A validação visual foi realizada posteriormente na revisão descrita em calendario-ihc-2026-10-18.md. Deploy não realizado.

A atualização backend/admin/add-calendar-categories.sql continua necessária para persistir as novas categorias manuais da rodada anterior em bancos ainda não atualizados. Nenhuma alteração foi aplicada ao banco externo; os feriados automáticos não precisam dessa migração.

# Revisão de Natal e Ano-Novo na importação

A classificação da prévia passou a reconhecer Natal em 25/12 e Confraternização Universal, Ano-Novo ou Réveillon em 01/01 como feriado, mesmo sem uma cor utilizável no PDF. O nome e a data devem coincidir e o registro deve representar um único dia; atividades como Natal solidário não são convertidas automaticamente.

Para 2026, Véspera de Natal (24/12) e Véspera de Ano-Novo/Réveillon (31/12) recebem ponto facultativo, com indicação de que a regra federal é após as 13h e deve ser conferida para o Campus. A regra das vésperas não é estendida automaticamente a outros anos. Fonte: [calendário oficial de 2026 do MGI](https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026).

O teste com o PDF real da Resolução 1591/2025 agora verifica explicitamente a categoria de Natal e Véspera de Réveillon, além das 13 datas anuais. Registros já salvos não são alterados pela leitura de uma nova prévia.
