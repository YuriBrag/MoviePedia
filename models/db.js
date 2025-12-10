const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../data', 'catalogo.db');
const db = new Database(dbPath);


db.exec(`
CREATE TABLE IF NOT EXISTS filmes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo   TEXT NOT NULL,
  ano      INTEGER NOT NULL,
  direcao  TEXT NOT NULL,
  generos  TEXT NOT NULL,
  nota     REAL,
  nota_omdb REAL,
  sinopse  TEXT,
  capa     TEXT
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hash_senha TEXT NOT NULL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filme_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  nota REAL NOT NULL,
  comentario TEXT,
  data DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(filme_id) REFERENCES filmes(id),
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);
`);

try {
  const fCount = db.prepare('SELECT COUNT(*) as total FROM filmes').get().total;
  console.log(`[DB] Filmes: ${fCount}`);
} catch (e) { console.error("[DB] Erro ao contar filmes:", e.message); }


function generosToString(generos) {
  if (!generos) return '';
  if (Array.isArray(generos)) {
    return generos.join('|');
  }
  return String(generos);
}


function atualizarMediaFilme(filmeId) {
  const filme = db.prepare('SELECT nota_omdb FROM filmes WHERE id = ?').get(filmeId);
  const notaOmdb = filme && filme.nota_omdb ? filme.nota_omdb : 0;

  const result = db.prepare('SELECT AVG(nota) as media_users FROM reviews WHERE filme_id = ?').get(filmeId);
  const mediaUsers = result.media_users;

  let novaNotaFinal;

  if (!mediaUsers) {
    novaNotaFinal = notaOmdb;
  } else {
    if (notaOmdb === 0) {
      novaNotaFinal = mediaUsers;
    } else {
      novaNotaFinal = (mediaUsers + notaOmdb) / 2;
    }
  }

  db.prepare('UPDATE filmes SET nota = ? WHERE id = ?').run(novaNotaFinal.toFixed(1), filmeId);
}

function criarReview(usuarioId, filmeId, nota, comentario) {
  const stmt = db.prepare(`
    INSERT INTO reviews (usuario_id, filme_id, nota, comentario)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(usuarioId, filmeId, nota, comentario);

  atualizarMediaFilme(filmeId);
}

function listarReviewsDoFilme(filmeId) {
  const stmt = db.prepare(`
    SELECT r.*, u.nome as nome_usuario 
    FROM reviews r
    JOIN usuarios u ON r.usuario_id = u.id
    WHERE r.filme_id = ?
    ORDER BY r.data DESC
  `);
  return stmt.all(filmeId);
}


function buscarUsuarioPorEmail(email) {
  const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ?');
  return stmt.get(email);
}

function buscarUsuarioPorId(id) {
  const stmt = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?');
  return stmt.get(id);
}

function criarUsuario({ nome, email, hash_senha }) {
  const stmt = db.prepare(`
    INSERT INTO usuarios (nome, email, hash_senha)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(nome, email, hash_senha);
  return { id: info.lastInsertRowid, nome, email };
}


function listarFilmes(filtros = {}) {
  const { q, genero, ano } = filtros;

  const stmt = db.prepare(`
    SELECT id, titulo, ano, direcao, generos, nota, sinopse, capa
    FROM filmes
    ORDER BY id DESC
    LIMIT 21
  `);

  let filmes = stmt.all();

  filmes = filmes.map((f) => ({
    ...f,
    generos: f.generos ? f.generos.split(/[|,]/).map((g) => g.trim()).filter(Boolean) : [],
  }));

  if (q) {
    const termo = q.toLowerCase();
    filmes = filmes.filter(f =>
      f.titulo.toLowerCase().includes(termo) ||
      f.direcao.toLowerCase().includes(termo)
    );
  }
  if (genero) {
    const gBusca = genero.toLowerCase().trim();
    
    filmes = filmes.filter(f => 
      f.generos.some(g => g.toLowerCase().includes(gBusca))
    );
  }

  if (ano) {
    filmes = filmes.filter(f => f.ano == ano);
  }

  return filmes;
}

function obterFilmePorTitulo(tituloBusca) {
  const stmt = db.prepare('SELECT * FROM filmes WHERE titulo = ? COLLATE NOCASE');
  const filme = stmt.get(tituloBusca.trim());
  if (!filme) return null;
  return {
    ...filme,
    generos: filme.generos ? filme.generos.split('|').map((g) => g.trim()).filter(Boolean) : [],
  };
}

function obterFilmePorId(id) {
  const stmt = db.prepare('SELECT * FROM filmes WHERE id = ?');
  const filme = stmt.get(id);
  if (!filme) return null;
  return {
    ...filme,
    generos: filme.generos ? filme.generos.split('|').map((g) => g.trim()).filter(Boolean) : [],
  };
}

function inserirFilme({ titulo, ano, direcao, generos, nota, sinopse, capa }) {
  const generosStr = generosToString(generos);
  const notaInicial = nota ?? 0;

  const stmt = db.prepare(`
    INSERT INTO filmes (titulo, ano, direcao, generos, nota, nota_omdb, sinopse, capa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(titulo, ano, direcao, generosStr, notaInicial, notaInicial, sinopse, capa || '');

  return {
    id: info.lastInsertRowid,
    titulo,
    ano,
    direcao,
    generos: Array.isArray(generos) ? generos : generosStr.split('|'),
    nota: notaInicial,
    sinopse: sinopse ?? '',
    capa: capa || ''
  };
}

const inserirLista = db.transaction((lista) => {
  const result = [];
  for (const item of lista) {
    result.push(inserirFilme(item));
  }
  return result;
});

module.exports = {
  listarFilmes,
  obterFilmePorId,
  obterFilmePorTitulo,
  inserirFilme,
  inserirLista,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  criarUsuario,
  criarReview,
  listarReviewsDoFilme
};