import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos da pasta dist
app.use(express.static(join(__dirname, "dist"), { maxAge: "1d" }));

// SPA fallback - redirecionar todas as rotas não encontradas para index.html
app.get("*", (req, res) => {
  // Se for uma requisição por um arquivo com extensão específica, retornar 404
  if (req.path.match(/\.\w+$/)) {
    res.status(404).send("Not found");
    return;
  }

  // Para todas as outras rotas, servir index.html (SPA)
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
