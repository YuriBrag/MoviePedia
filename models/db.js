const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../data', 'catalogo.db');
const db = new Database(dbPath);
const csvPath = path.join(__dirname, '../filmes.csv');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hash_senha TEXT NOT NULL
);
`);
try {
  const count = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
  console.log(`[DB CHECK] O servidor encontrou ${count} usuarios ativos na tabela 'usuarios'.`);
  if (count === 0) {
    console.warn("AVISO: Nao ha usuarios ativos.");
  }
} catch (e) {
  console.error("[DB CHECK] Erro ao verificar contagem:", e.message);
}

db.exec(`
CREATE TABLE IF NOT EXISTS filmes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo   TEXT NOT NULL,
  ano      INTEGER NOT NULL,
  direcao  TEXT NOT NULL,
  generos  TEXT NOT NULL,
  nota     REAL,
  sinopse  TEXT,
  capa     TEXT
);
`);

try {
  const count = db.prepare('SELECT COUNT(*) as total FROM filmes').get().total;
  console.log(`[DB CHECK] O servidor encontrou ${count} filmes na tabela 'filmes'.`);
  if (count === 0) {
    console.warn("AVISO: O banco está vazio.");
  }
} catch (e) {
  console.error("[DB CHECK] Erro ao verificar contagem:", e.message);
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

function generosToString(generos) {
  if (!generos) return '';
  if (Array.isArray(generos)) {
    return generos.join('|');
  }
  return String(generos);
}

function listarFilmes(filtros = {}) {
  const { q, genero, ano } = filtros;

  const stmt = db.prepare(`
    SELECT id, titulo, ano, direcao, generos, nota, sinopse, capa
    FROM filmes
    ORDER BY id DESC
    LIMIT 20
  `);

  let filmes = stmt.all();

  filmes = filmes.map((f) => ({
    ...f,
    generos: f.generos ? f.generos.split('|').map((g) => g.trim()).filter(Boolean) : [],
  }));

  if (q) {
    const termo = q.toLowerCase();
    filmes = filmes.filter(f =>
      f.titulo.toLowerCase().includes(termo) ||
      f.direcao.toLowerCase().includes(termo)
    );
  }

  if (genero) {
    const gBusca = genero.toLowerCase();
    filmes = filmes.filter(f =>
      f.generos.some(g => g.toLowerCase() === gBusca)
    );
  }

  if (ano) {
    filmes = filmes.filter(f => f.ano == ano);
  }

  return filmes;
}
function obterFilmePorTitulo(tituloBusca) {
  const stmt = db.prepare(`
    SELECT * FROM filmes 
    WHERE titulo = ? COLLATE NOCASE
  `);
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

  const stmt = db.prepare(`
    INSERT INTO filmes (titulo, ano, direcao, generos, nota, sinopse, capa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(titulo, ano, direcao, generosStr, nota, sinopse, capa || '');

  return {
    id: info.lastInsertRowid,
    titulo,
    ano,
    direcao,
    generos: Array.isArray(generos) ? generos : generosStr.split('|'),
    nota: nota ?? null,
    sinopse: sinopse ?? '',
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
  inserirFilme,
  inserirLista,
  obterFilmePorTitulo, 
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  criarUsuario
};