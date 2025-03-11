# GestObra - Sistema de Gestão de Obras

GestObra é uma aplicação web para gerenciamento de obras e projetos de construção civil. O sistema permite o controle de etapas, orçamentos, cronogramas e documentos relacionados a cada obra.

## Funcionalidades

- Cadastro e gerenciamento de obras
- Controle de etapas e subetapas
- Gestão de orçamentos e custos
- Acompanhamento de cronograma
- Gerenciamento de documentos
- Controle de acesso e usuários

## Tecnologias Utilizadas

- React.js
- Vite
- Tailwind CSS
- Supabase (Backend e Autenticação)

## Pré-requisitos

- Node.js 16.x ou superior
- NPM ou Yarn
- Conta no Supabase

## Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/gestobra.git
cd gestobra
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Copie o arquivo de exemplo de variáveis de ambiente:
```bash
cp .env.example .env
```

4. Configure as variáveis de ambiente no arquivo `.env`:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

## Estrutura do Projeto

```
src/
  ├── components/     # Componentes React reutilizáveis
  ├── context/       # Contextos React (ex: AuthContext)
  ├── pages/         # Páginas da aplicação
  ├── services/      # Serviços e integrações
  ├── styles/        # Arquivos de estilo
  └── utils/         # Funções utilitárias
```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera a build de produção
- `npm run preview` - Visualiza a build de produção localmente

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
