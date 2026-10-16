/**
 * Arcádia — configuração pública do navegador.
 * O login Google permanece indisponível enquanto não houver integração no backend.
 * A recuperação de senha utiliza SMTP no backend; nunca coloque segredos aqui.
 */

window.ARCADIA_CONFIG = {
    // Identificador público do cliente Google; não habilita autenticação sozinho.
    googleClientId: '206457421738-i2um6qk5cs0be9chqe38kcrqbk9edae4.apps.googleusercontent.com',

    // Endereço público da API; vazio utiliza o padrão definido em api.js.
    backendUrl: ''
};
