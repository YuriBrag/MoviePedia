# MoviePedia
Projeto desenvolvido em dupla, para a disciplina de Proj. e Des. de Sist. para a Web, no curso de graduação em Ciência da Computação - UFV.
Sistema de catalogação de filmes com integração automática à API OMDb e atualizações em tempo real. O projeto apresenta uma interface moderna (Dark Mode) inspirada no Letterboxd e utiliza cache local para otimização de requisições.

AUTORES: Yuri Cardoso Bragine e Ana Clara Guerra Torres.

## Funcionalidades

- **Vitrine de Filmes:** Exibição dos últimos filmes adicionados em grade responsiva.
- **Busca Inteligente (Cache Read-Through):**
  - Verifica se o filme existe no banco local (SQLite).
  - Se não existir, busca na **OMDb API**, salva no banco automaticamente e retorna o resultado.
- **Atualização em Tempo Real:** Uso de **WebSockets** para atualizar a vitrine de todos os clientes conectados assim que um novo filme é adicionado.
- **Detalhes do Filme:** Exibição de capa, sinopse, nota, direção e ano.
- **Seed Automático:** Script para popular o banco inicial com clássicos do cinema.

## Tecnologias Utilizadas

- **Back-end:** Node.js, Express.js
- **Banco de Dados:** SQLite (com `better-sqlite3`)
- **Front-end:** HTML5, CSS3, JavaScript
- **API Externa:** OMDb API
- **Comunicação:** WebSockets (`ws`)

## Como Rodar o Projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- NPM

### 1. Instalação
Clone o repositório e instale as dependências:

\`\`\`bash
git clone https://github.com/YuriBrag/MoviePedia.git
cd MoviePedia
npm install
\`\`\`

### 2. Configuração (.env)
Crie um arquivo \`.env\` na raiz do projeto e adicione sua chave da OMDb:

\`\`\`env
OMDB_API_KEY=sua_chave_aqui
PORT=3000
\`\`\`
*(Você pode obter uma chave gratuita em [omdbapi.com](http://www.omdbapi.com/apikey.aspx))*

### 3. Banco de Dados
Para criar o banco e popular com filmes iniciais, rode o script de seed