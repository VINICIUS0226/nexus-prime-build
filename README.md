# Nexus Prime

Sistema web para gestão comercial, estoque, reservas, vendas e portal do cliente.

## Tecnologias

- React
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- shadcn/ui

## Configuração local

Instale as dependências:

```sh
npm install
```

Crie um arquivo `.env` com base em `.env.example` e preencha as variáveis do Supabase:

```sh
cp .env.example .env
```

Inicie o ambiente de desenvolvimento:

```sh
npm run dev
```

## Build

```sh
npm run build
```

Para servir o build com o servidor Express incluído:

```sh
npm start
```
