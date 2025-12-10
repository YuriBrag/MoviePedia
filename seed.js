require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const API_KEY = process.env.OMDB_API_KEY;
const DB_PATH = path.join(__dirname, 'data', 'catalogo.db');

const FILMES_PARA_BUSCAR = [
  "Inception", "The Matrix", "Interstellar", "Parasite", 
  "The Grand Budapest Hotel", "Spirited Away", "Pulp Fiction", 
  "The Dark Knight", "Blade Runner 2049", "Dune", 
  "Everything Everywhere All At Once", "Oppenheimer", "Barbie",
  "Spider-Man: Into the Spider-Verse", "The Godfather", "Fight Club",
  "Breaking Bad", "Stranger Things" 
];

async function seed() {
  console.log("Iniciando o povoamento do banco de dados...");
  
  if (!API_KEY) {
    console.error("ERRO: Chave da API não encontrada no .env");
    return;
  }

  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS filmes (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo   TEXT NOT NULL,
      ano      INTEGER NOT NULL,
      direcao  TEXT NOT NULL,
      generos  TEXT NOT NULL,
      nota     REAL,      -- Média final
      nota_omdb REAL,     -- Nota fixa da API
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

  const insert = db.prepare(`
    INSERT INTO filmes (titulo, ano, direcao, generos, nota, nota_omdb, sinopse, capa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let sucessos = 0;

  for (const titulo of FILMES_PARA_BUSCAR) {
    try {
      console.log(`Buscando: ${titulo}...`);
      
      const response = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(titulo)}`);
      const data = await response.json();

      if (data.Response === 'True') {
        const nota = parseFloat(data.imdbRating) || 0;

        insert.run(
          data.Title,                 
          parseInt(data.Year) || 0,   
          data.Director,              
          data.Genre,                 
          nota,                       
          nota,                       
          data.Plot,                  
          data.Poster                 
        );
        console.log(`   Salvo: ${data.Title}`);
        sucessos++;
      } else {
        console.warn(`   Não encontrado: ${titulo} (${data.Error})`);
      }

    } catch (error) {
      console.error(`   Erro ao processar ${titulo}:`, error.message);
    }
  }

  console.log("------------------------------------------------");
  console.log(`Concluído! ${sucessos} itens inseridos.`);
}

seed();