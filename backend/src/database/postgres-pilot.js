/* Composição de ensaio: não lê URLs, não abre pool e não é importada pelas rotas. */
function createPostgresPilot(database) {
    if (typeof database?.query !== 'function' || typeof database?.transaction !== 'function')
        throw new Error('Informe explicitamente o banco PostgreSQL de ensaio.');
    return {
        tasks: require('../models/postgres/tasks.model').createTasksModel(database),
        archive: require('../services/task-archive.service').createTaskArchive(database, { dialect: 'postgres' }),
        workspace: require('../services/google-workspace.service').createWorkspace(database, { dialect: 'postgres' })
    };
}
module.exports = { createPostgresPilot };
