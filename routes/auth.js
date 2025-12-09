const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/db');

router.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  try {
    const usuarioExistente = db.buscarUsuarioPorEmail(email);
    if (usuarioExistente) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash_senha = bcrypt.hashSync(senha, salt);

    const novoUsuario = db.criarUsuario({ nome, email, hash_senha });
    
    req.session.userId = novoUsuario.id;

    res.status(201).json({ message: 'Usuário criado!', user: { nome, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }
});

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const usuario = db.buscarUsuarioPorEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.hash_senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    req.session.userId = usuario.id;

    res.json({ message: 'Login realizado com sucesso!', user: { id: usuario.id, nome: usuario.nome } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Erro ao fazer logout' });
    res.json({ message: 'Logout realizado.' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ loggedIn: false });
  }

  const usuario = db.buscarUsuarioPorId(req.session.userId);
  if (!usuario) {
    return res.status(401).json({ loggedIn: false });
  }

  res.json({ loggedIn: true, user: usuario });
});

module.exports = router;