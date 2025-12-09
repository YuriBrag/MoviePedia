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
  "Spider-Man: Into the Spider-Verse", "The Godfather", "Fight Club"
];

async function seed() {
  console.log("Iniciando o povoamento do banco de dados.");
  
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
      nota     REAL,
      sinopse  TEXT,
      capa     TEXT
    );
  `);
  
  const insert = db.prepare(`
    INSERT INTO filmes (titulo, ano, direcao, generos, nota, sinopse, capa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let sucessos = 0;

  for (const titulo of FILMES_PARA_BUSCAR) {
    try {
      console.log(`Buscando: ${titulo}.`);
      
      const response = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(titulo)}`);
      const data = await response.json();

      if (data.Response === 'True') {
        insert.run(
          data.Title,
          parseInt(data.Year) || 0,
          data.Director,
          data.Genre,
          parseFloat(data.imdbRating) || 0,
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
  console.log(`Concluído! ${sucessos} filmes inseridos com sucesso.`);
  console.log("Inicie seu servidor com 'npm start'!");
}

seed();