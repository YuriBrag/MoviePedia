const db = require('./models/db');
const bcrypt = require('bcryptjs');


const EMAIL_USUARIO_TESTE = 'ana.torres1@ufv.br'; 

// Lista de reviews para popular o histórico
const REVIEWS = [
    { titulo: "Inception", nota: 9.5, comentario: "Obra-prima de Nolan. Precisa ser visto várias vezes!" },
    { titulo: "The Matrix", nota: 10.0, comentario: "Um marco na ficção científica e ação. Revolucionário!" },
    { titulo: "Oppenheimer", nota: 8.8, comentario: "Intenso e visualmente impressionante. Cillian Murphy está incrível." },
    { titulo: "Barbie", nota: 7.2, comentario: "Divertido e surpreendentemente profundo nas mensagens sociais." },
    { titulo: "Fight Club", nota: 9.0, comentario: "Não deveria falar sobre isso. Mas é um filme essencial." }
];


async function seedReviews() {
    console.log("Iniciando o povoamento das reviews...");
    
    const usuario = db.buscarUsuarioPorEmail(EMAIL_USUARIO_TESTE);

    if (!usuario) {
        console.error(`\nERRO: Usuário com o email '${EMAIL_USUARIO_TESTE}' não encontrado no banco.`);
        console.error("Por favor, edite o arquivo seed-reviews.js e insira um email de usuário válido.");
        return;
    }

    console.log(`Usuário encontrado: ${usuario.nome} (ID: ${usuario.id})`);
    
    let reviewsInseridas = 0;

    for (const review of REVIEWS) {
        try {
            const filme = db.obterFilmePorTitulo(review.titulo);

            if (!filme) {
                console.warn(`\nAviso: Filme '${review.titulo}' não encontrado no catálogo. Pulando review.`);
                continue;
            }


            db.criarReview(usuario.id, filme.id, review.nota, review.comentario);
            console.log(`✅ Review adicionada: ${filme.titulo} (Nota: ${review.nota})`);
            reviewsInseridas++;

        } catch (error) {
            console.error(`\nErro ao adicionar review para ${review.titulo}: ${error.message}`);
        }
    }

    console.log("-----------------------------------------");
    console.log(`Concluído! ${reviewsInseridas} reviews inseridas para o usuário.`);
}

seedReviews();