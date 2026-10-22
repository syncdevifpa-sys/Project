const { validateContent, editContent } = require('../services/content-edit.service');
const projectsModel = require('../models/projects.model');

async function listProjects(req, res) {
    try {
        const projects = await projectsModel.listProjects();

        return res.json(projects);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao listar projetos:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getProjectById(req, res) {
    try {
        const project = await projectsModel.findProjectById(req.params.id);

        if (!project || project.aprovacao !== 'aprovado') {
            return res.status(404).json({
                error: 'Projeto não encontrado.'
            });
        }

        return res.json(project);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao buscar projeto:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createProject(req, res) {
    try {
        const { titulo, descricao } = req.body;

        if (!titulo || !descricao) {
            return res.status(400).json({
                error: 'Título e descrição são obrigatórios.'
            });
        }

        const result = await projectsModel.createProject(
            req.user.id_usuario,
            validateContent('projects', req.body, true)
        );

        return res.status(201).json({
            message: 'Projeto criado com sucesso.',
            projectId: result.insertId
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao criar projeto:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateProject(req, res) {
    try {
        const result = await editContent('projects', req.params.id, req.body, req.user.id_usuario);

        if (!result) {
            return res.status(404).json({
                error: 'Projeto não encontrado.'
            });
        }

        return res.json({
            message: 'Projeto atualizado com sucesso.'
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao atualizar projeto:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteProject(req, res) {
    try {
        const result = await projectsModel.deleteProject(req.params.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Projeto não encontrado.'
            });
        }

        return res.json({
            message: 'Projeto excluído com sucesso.'
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao excluir projeto:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function approveProject(req, res) {
    try {
        const result = await projectsModel.approveProject(req.params.id, req.user.id_usuario);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Projeto não encontrado.'
            });
        }

        return res.json({
            message: 'Projeto aprovado com sucesso.'
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao aprovar projeto:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function rejectProject(req, res) {
    try {
        const result = await projectsModel.rejectProject(req.params.id, req.user.id_usuario);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Projeto não encontrado.'
            });
        }

        return res.json({
            message: 'Projeto recusado com sucesso.'
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao recusar projeto:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function registerForProject(req, res) {
    try {
        const project = await projectsModel.findProjectById(req.params.id);

        if (!project) {
            return res.status(404).json({
                error: 'Projeto não encontrado.'
            });
        }

        if (project.aprovacao !== 'aprovado') {
            return res.status(400).json({
                error: 'Projeto não está aprovado.'
            });
        }

        const result = await projectsModel.registerForProject(req.params.id, req.user.id_usuario);

        return res.status(201).json({
            message: 'Inscrição realizada com sucesso.',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao se inscrever para o projeto:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Usuário já está inscrito para este projeto.'
            });
        }

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function cancelRegistration(req, res) {
    try {
        const result = await projectsModel.cancelRegistration(req.params.id, req.user.id_usuario);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Inscrição não encontrada.'
            });
        }

        return res.json({
            message: 'Inscrição cancelada com sucesso.'
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao cancelar inscrição:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function listProjectRegistrations(req, res) {
    try {
        const registrations = await projectsModel.listProjectRegistrations(req.params.id);

        return res.json(registrations);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'ER_BAD_FIELD_ERROR')
            return res
                .status(503)
                .json({
                    error: 'Atualize o banco para configurar a participação da Comunidade externa em projetos.'
                });
        console.error('Erro ao buscar inscrições:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    registerForProject,
    cancelRegistration,
    listProjectRegistrations
};
