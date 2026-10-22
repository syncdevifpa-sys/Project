# Exclusão administrativa de contas

O administrador pode excluir definitivamente uma pessoa desativada mesmo com histórico. A confirmação identifica o nome e avisa sobre a remoção dos dados vinculados.

A operação remove os conteúdos de autoria da pessoa (avisos, tarefas, solicitações de documentos, calendário, projetos e links), sua biblioteca pessoal e solicitações de vínculo. Disciplinas sob responsabilidade de um professor excluído são removidas com matrículas, convites e publicações. Anexos da biblioteca dessa pessoa também são retirados das publicações de disciplinas. Convites destinados ao e-mail da conta são removidos. Registros de terceiros que apenas referenciam a pessoa como responsável ou revisor seguem as regras SET NULL do esquema; contas de terceiros e turmas compartilhadas permanecem.

Sessões, recuperação de senha, identidade Google e preferências ligadas à conta seguem a limpeza e as cascatas existentes. A transação reverte todas as alterações em caso de falha, sem desativar chaves estrangeiras. Não exige migração SQL no esquema atual.

O último administrador ativo permanece protegido. A exclusão própria nas configurações mantém a exigência de senha, confirmação e ausência de histórico. Nenhuma conta real foi excluída para validar esta alteração.
