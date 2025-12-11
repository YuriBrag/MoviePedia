var express = require('express');
var router = express.Router();

/*
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
*/

const db = require('../models/db');
const bcrypt = require('bcryptjs'); // hash senha

// garante usuario logado antes
function ensureAuthenticated(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/api/auth/login'); 
    }
}

// perfil principal
router.get('/', ensureAuthenticated, async function(req, res, next) {
    const usuarioId = req.session.usuario.id;
    const usuario = db.buscarUsuarioPorId(usuarioId);

    res.render('perfil', { 
        title: 'Meu Perfil',
        usuario: usuario,
        abaAtiva: 'perfil'
    });
});

// processar edicao de perfil
router.post('/editar', ensureAuthenticated, async function(req, res, next) {
    const { nome, email, senha_antiga, nova_senha } = req.body;
    const usuarioId = req.session.usuario.id;
    const usuarioAtual = db.buscarUsuarioPorEmail(req.session.usuario.email); 

    let hash_senha = usuarioAtual.hash_senha;
    let dadosAtualizados = { id: usuarioId };
    let mensagemErro = '';

    try {
        if (nova_senha) {
            if (!senha_antiga || !bcrypt.compareSync(senha_antiga, usuarioAtual.hash_senha)) {
                mensagemErro = 'Senha antiga inválida.';
            } else {
                dadosAtualizados.hash_senha = bcrypt.hashSync(nova_senha, 10);
            }
        }

        if (mensagemErro) {
            return res.render('perfil', { 
                title: 'Meu Perfil',
                usuario: usuarioAtual,
                abaAtiva: 'perfil',
                erro: mensagemErro
            });
        }
        
        if (nome) dadosAtualizados.nome = nome;
        if (email) dadosAtualizados.email = email;

        db.atualizarUsuario(dadosAtualizados);

        req.session.usuario.nome = nome || req.session.usuario.nome;
        req.session.usuario.email = email || req.session.usuario.email;
        
        res.redirect('/users?sucesso=perfil_atualizado');
        
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
             mensagemErro = 'Este e-mail já está em uso.';
        } else {
             mensagemErro = 'Erro interno ao atualizar perfil.';
        }
        res.render('perfil', { 
            title: 'Meu Perfil',
            usuario: usuarioAtual,
            abaAtiva: 'perfil',
            erro: mensagemErro
        });
    }
});

// excluir conta
router.post('/excluir', ensureAuthenticated, async function(req, res, next) {
    const usuarioId = req.session.usuario.id;
    
    db.excluirUsuario(usuarioId);
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao destruir sessão:', err);
        }
        res.redirect('/?sucesso=conta_excluida');
    });
});

// historico comentarios
router.get('/historico', ensureAuthenticated, async function(req, res, next) {
    const usuarioId = req.session.usuario.id;
    const reviews = db.listarReviewsDoUsuario(usuarioId);

    res.render('perfil', { 
        title: 'Meu Histórico',
        reviews: reviews,
        usuario: req.session.usuario,
        abaAtiva: 'historico' 
    });
});

module.exports = router;