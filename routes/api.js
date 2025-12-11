const API_KEY = process.env.OMDB_API_KEY;

if (!API_KEY) {
  console.error("ERRO: A chave OMDB_API_KEY não foi configurada no .env");
}
const express = require('express');
const router = express.Router();

const db = require('../models/db');

router.get('/filmes', function (req, res, next) {
  try {
    const { q, genero, ano } = req.query;
    const filmes = db.listarFilmes({ q, genero, ano });

    res.json(filmes);
  } catch (err) {
    next(err);
  }
});



router.get('/filmes/:id', function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const filme = db.obterFilmePorId(id);
    if (!filme) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    res.json(filme);
  } catch (err) {
    next(err);
  }
});


router.post('/filmes', function (req, res, next) {
  try {
    const { titulo, ano, direcao, generos, nota, sinopse } = req.body || {};

    if (!titulo || !ano || !direcao || !generos) {
      return res.status(400).json({ 
        error: 'Campos obrigatorios: titulo, ano, direcao, generos.' 
      });
    }

    const filmeParaInserir = {
      titulo: titulo.trim(),
      ano: parseInt(ano, 10), 
      direcao: direcao.trim(),
      generos: generos, 
      nota: nota ? parseFloat(nota) : null,
      sinopse: sinopse ? sinopse.trim() : ''
    };

    const filmeInserido = db.inserirFilme(filmeParaInserir);

    const wss = req.app.get('wss');

    if (wss) {
      const mensagemBroadcast = JSON.stringify({
        tipo: 'novo-filme',
        dados: filmeInserido
      });

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(mensagemBroadcast);
        }
      });
    }

    return res.status(201).json(filmeInserido);

  } catch (err) {
    next(err);
  }
});

/*
router.post('/reviews', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Você precisa estar logado para avaliar.' });
  }

  const { filmeId, nota, comentario } = req.body;
  
  if (!filmeId || !nota) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  if (isNaN(notaFloat) || notaFloat < 0 || notaFloat > 10) {
    return res.status(400).json({ error: 'A nota deve ser entre 0 e 10.' });
  }

  try {
    db.criarReview(req.session.userId, filmeId, parseFloat(nota), comentario);
    res.status(201).json({ message: 'Review adicionado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar review.' });
  }
});
*/

router.post('/reviews', (req, res) => {
    if (!req.session.usuario || !req.session.usuario.id) { 
      return res.status(401).json({ error: 'Você precisa estar logado para avaliar.' });
    }

    const { filmeId, nota, comentario } = req.body;
    
    if (!filmeId || nota === undefined) {
      return res.status(400).json({ error: 'Filme ID e nota são obrigatórios.' });
    }

    const notaFloat = parseFloat(nota);
    
    if (isNaN(notaFloat) || notaFloat < 0 || notaFloat > 10) { 
      return res.status(400).json({ error: 'A nota deve ser entre 0 e 10.' });
    }

    try {
      db.criarReview(req.session.usuario.id, filmeId, notaFloat, comentario);
      res.status(201).json({ message: 'Review adicionado!' });  
    } catch (err) {
      console.error("Erro ao salvar review:", err);
      res.status(500).json({ error: 'Erro ao salvar review.' });
    }
});

router.get('/reviews/:filmeId', (req, res) => {
  try {
    const reviews = db.listarReviewsDoFilme(req.params.filmeId);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar reviews.' });
  }
});

router.get('/buscar-omdb', async (req, res) => {
  const titulo = req.query.titulo;
  if (!titulo) return res.status(400).json({ error: 'Título necessário' });

  try {
    const filmeLocal = db.obterFilmePorTitulo(titulo);

    if (filmeLocal) {
      console.log(`[CACHE HIT] Filme "${titulo}" encontrado no banco local.`);
      return res.json(filmeLocal);
    }

    console.log(`[CACHE MISS] Buscando "${titulo}" na OMDb...`);
    const url = `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=${encodeURIComponent(titulo)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({ error: data.Error || 'Filme não encontrado' });
    }

    const novoFilme = {
      titulo: data.Title,
      ano: parseInt(data.Year) || 0,
      direcao: data.Director,
      generos: data.Genre, 
      nota: parseFloat(data.imdbRating) || 0,
      sinopse: data.Plot,
      capa: data.Poster
    };

    const infoInsercao = db.inserirFilme(novoFilme);

    novoFilme.id = infoInsercao.id;

    const wss = req.app.get('wss');
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ tipo: 'novo-filme', dados: novoFilme }));
        }
      });
    }

    console.log(`[AUTO-SAVE] Filme "${novoFilme.titulo}" salvo no banco com ID ${novoFilme.id}.`);
    
    res.json(novoFilme);

  } catch (error) {
    console.error("Erro na busca inteligente:", error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});


// auxiliar de autenticacao 
function ensureApiAuthenticated(req, res, next) {
    if (req.session.usuario && req.session.usuario.id) {
        next();
    } else {
        res.status(401).json({ error: 'Você precisa estar logado para realizar esta ação.' });
    }
}


router.delete('/reviews/:reviewId', ensureApiAuthenticated, (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  const usuarioId = req.session.usuario.id;

  if (Number.isNaN(reviewId)) {
    return res.status(400).json({ error: 'ID da review inválido.' });
  }

  try {
    const resultado = db.excluirReview(reviewId, usuarioId);

    if (resultado.changes === 0) {
      return res.status(404).json({ error: 'Review não encontrada ou você não tem permissão para excluí-la.' });
    }

    res.json({ message: 'Review excluída com sucesso.', reviewId: reviewId });

  } catch (e) {
    console.error("Erro ao excluir review:", e);
    res.status(500).json({ error: 'Erro interno ao excluir review.' });
  }
});


module.exports = router;
