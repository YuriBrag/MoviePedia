# MoviePedia

Projeto desenvolvido em dupla para a disciplina de **Projeto e Desenvolvimento de Sistemas para a Web**, no curso de graduação em Ciência da Computação - UFV.

O **MoviePedia** é um sistema de catalogação de filmes e séries que integra dados externos (API OMDb) com uma comunidade local. O projeto apresenta uma interface moderna (Dark Mode) inspirada no Letterboxd, utiliza cache local para otimização e permite interação social através de avaliações.

**AUTORES:** Yuri Cardoso Bragine e Ana Clara Guerra Torres.

## Funcionalidades

### Catálogo e Busca
- **Vitrine Dinâmica:** Exibição dos últimos filmes adicionados/pesquisados em grade responsiva.
- **Busca Inteligente (Cache Read-Through):**
  - Verifica se o filme existe no banco local (SQLite).
  - Se não existir, busca na **OMDb API**, salva no banco automaticamente e retorna o resultado.
- **Atualização em Tempo Real:** Uso de **WebSockets** para atualizar a vitrine de todos os clientes conectados instantaneamente quando um novo filme é adicionado ao catálogo.

### Área do Usuário
- **Autenticação:** Sistema de Cadastro e Login seguro (senhas criptografadas).
- **Gerenciamento de Perfil:** O usuário pode alterar seu nome, e-mail e senha.
- **Histórico de Atividades:** Painel exclusivo onde o usuário pode visualizar e excluir suas avaliações antigas.

### Sistema de Avaliações (Reviews)
- **Avaliar Filmes:** Usuários logados podem dar notas (0-10) e escrever comentários sobre filmes e séries.
- **Nota Média Ponderada:** A nota exibida no filme é recalculada automaticamente, fazendo uma média entre a nota original da API (IMDb) e a média das notas dos usuários do MoviePedia.
- **Comunidade:** Visualização dos comentários e notas de outros usuários na página de detalhes do filme.

## Tecnologias Utilizadas

- **Back-end:** Node.js, Express.js
- **Banco de Dados:** SQLite (com `better-sqlite3` e `connect-sqlite3` para sessões)
- **Front-end:** HTML5, CSS3, JavaScript (Vanilla)
- **API Externa:** OMDb API
- **Comunicação Real-time:** WebSockets (`ws`)
- **Autenticação:** `bcryptjs` (hash de senha) e `express-session`

## Como Rodar o Projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- NPM

### 1. Instalação
Clone o repositório e instale as dependências:

```bash
git clone [https://github.com/YuriBrag/MoviePedia.git](https://github.com/YuriBrag/MoviePedia.git)
cd MoviePedia
npm install