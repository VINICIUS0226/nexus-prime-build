# Nexus Prime

Projeto desenvolvido para entrega à Brisa em razão do processo de bolsa.

O sistema contempla gestão comercial com controle de estoque, clientes, reservas, vendas, relatórios, configurações da loja e portal do cliente.

## Acesso temporário

Enquanto houver créditos disponíveis no servidor temporário, o projeto pode ser acessado em:

https://nexus-prime-build.onrender.com/login

## Tecnologias

- React
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- shadcn/ui

## Como rodar localmente

Instale as dependências:

```sh
npm install
```

Crie o arquivo `.env` usando o modelo `.env.example`:

```sh
cp .env.example .env
```

Preencha no `.env` as variáveis do Supabase:

```env
VITE_SUPABASE_PROJECT_ID=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
VITE_SUPABASE_URL=""
```

Inicie o servidor de desenvolvimento:

```sh
npm run dev
```

Por padrão, o Vite abre em:

http://localhost:8080

## Build de produção

Gere os arquivos de produção:

```sh
npm run build
```

Para servir o build com o servidor Express incluído:

```sh
npm start
```

## Observações de implantação

O deploy temporário está configurado para ambiente Node.js. As variáveis do Supabase devem ser cadastradas no provedor de hospedagem para que autenticação, banco de dados e demais integrações funcionem corretamente.
