# Descrição de documentos

A mensagem “Descrição inválido.” não indicava necessariamente excesso de texto.
O validador genérico rejeitava todos os controles ASCII, incluindo quebras de
linha inseridas normalmente em uma textarea. Dois parágrafos, mesmo abaixo dos
3.000 caracteres permitidos, eram recusados antes da gravação.

A descrição tem validação própria: aceita parágrafos e tabulações, converte
CRLF/CR para LF e continua recusando controles como NUL, ESC e DEL. Tipos que não
sejam texto e excesso de tamanho recebem mensagens específicas. O texto não é
truncado silenciosamente. Texto opcional composto apenas por espaços fica vazio.

O limite permanece em 3.000 unidades UTF-16, igual ao `maxlength` nativo e ao
contador da textarea. Acentos comuns contam uma unidade; emojis fora do plano
básico contam duas. A API informa esse limite nos metadados da biblioteca, usados
no mesmo editor de criação e edição. Não há mudança de coluna ou nova migração.

Os testes cobrem criação e edição, limites Unicode, tipos inválidos, controles
proibidos e envio HTTP de PDF com descrição em query codificada. Um teste do
controlador real do frontend confirma contador, bloqueio antes do envio e
preservação de texto/arquivo ao ocorrer erro, sem conectar banco ou conta real.
