import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";

// Ajuste estas variáveis de ambiente antes de rodar:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env antes de rodar o importador.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const [xmlPath, zipPath] = process.argv.slice(2);

  if (!xmlPath || !zipPath) {
    console.error("Uso: npm run import:products -- ./caminho/arquivo.xml ./caminho/imagens.zip");
    process.exit(1);
  }

  const xmlFullPath = path.resolve(__dirname, "..", xmlPath);
  const zipFullPath = path.resolve(__dirname, "..", zipPath);

  if (!fs.existsSync(xmlFullPath)) {
    console.error(`XML não encontrado: ${xmlFullPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(zipFullPath)) {
    console.error(`ZIP não encontrado: ${zipFullPath}`);
    process.exit(1);
  }

  // 1) Ler e parsear XML
  const xmlContent = fs.readFileSync(xmlFullPath, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });
  const data = parser.parse(xmlContent);

  // IMPORTANTE: ajuste esta parte para a estrutura real do seu XML.
  // Aqui assumimos algo como: <produtos><produto>...</produto></produtos>
  const produtos = data.produtos?.produto || [];
  const produtosArray = Array.isArray(produtos) ? produtos : [produtos];

  console.log(`Encontrados ${produtosArray.length} produtos no XML.`);

  // 2) Extrair ZIP de imagens em memória
  const zip = new AdmZip(zipFullPath);
  const zipEntries = zip.getEntries();

  // Mapa simples: nome-do-arquivo -> buffer
  const imagensPorNome = new Map();
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    const base = path.basename(entry.entryName);
    imagensPorNome.set(base.toLowerCase(), entry);
  }

  // 3) Percorrer produtos do XML e inserir no Supabase
  for (const produto of produtosArray) {
    try {
      // Ajustar estes campos conforme seu XML
      const nome = produto.nome || produto.descricao || "Produto sem nome";
      const descricao = produto.descricao || null;
      const categoria = produto.categoria || null;
      const codigoBarras = produto.codigo_barras || produto.ean || null;
      const precoCusto = produto.preco_custo ? Number(produto.preco_custo) : null;
      const precoVenda = produto.preco_venda ? Number(produto.preco_venda) : null;

      // Inserir produto
      const { data: createdProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: nome,
          description: descricao,
          category: categoria,
          barcode: codigoBarras,
          cost_price: precoCusto,
          selling_price: precoVenda,
          profit_margin:
            precoCusto && precoVenda && precoCusto > 0
              ? Math.round(((precoVenda - precoCusto) / precoCusto) * 100)
              : null,
        })
        .select("*")
        .single();

      if (productError) throw productError;

      console.log(`Produto criado: ${createdProduct.name} (id=${createdProduct.id})`);

      // 3.1) Variações (tamanho/cor/estoque) – ajuste conforme o XML
      const variacoesRaw = produto.variacoes?.variacao;
      const variacoesArray = Array.isArray(variacoesRaw)
        ? variacoesRaw
        : variacoesRaw
          ? [variacoesRaw]
          : [];

      for (const variacao of variacoesArray) {
        if (!variacao) continue;
        const sku = variacao.sku || variacao.codigo || null;
        if (!sku) {
          console.warn("Variação sem SKU, ignorando.");
          continue;
        }

        const size = variacao.tamanho || null;
        const color = variacao.cor || null;
        const stock = variacao.estoque ? Number(variacao.estoque) : 0;
        const varPrecoCusto = variacao.preco_custo ? Number(variacao.preco_custo) : precoCusto;
        const varPrecoVenda = variacao.preco_venda ? Number(variacao.preco_venda) : precoVenda;

        const { error: variationError } = await supabase
          .from("product_variations")
          .insert({
            product_id: createdProduct.id,
            sku,
            size,
            color,
            stock_quantity: stock,
            min_stock_level: 5,
            cost_price: varPrecoCusto,
            selling_price: varPrecoVenda,
          });

        if (variationError) throw variationError;
      }

      // 3.2) Imagens – assumimos que o XML tem um campo com o nome do arquivo da imagem
      const imagensRaw = produto.imagens?.imagem;
      const imagensArray = Array.isArray(imagensRaw)
        ? imagensRaw
        : imagensRaw
          ? [imagensRaw]
          : [];

      let displayOrder = 0;
      for (const img of imagensArray) {
        if (!img) continue;
        const nomeCampo = typeof img === "string" ? img : img.arquivo;
        if (!nomeCampo) {
          console.warn(`Imagem sem nome de arquivo no XML para o produto ${nome}, ignorando.`);
          continue;
        }

        const nomeArquivo = nomeCampo.toString();
        const entry = imagensPorNome.get(nomeArquivo.toLowerCase());
        if (!entry) {
          console.warn(`Imagem "${nomeArquivo}" não encontrada no ZIP para o produto ${nome}.`);
          continue;
        }

        const fileBuffer = entry.getData();
        const ext = path.extname(nomeArquivo) || ".jpg";
        const uniqueSuffix = `${Date.now()}-${displayOrder}-${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = `products/${createdProduct.id}/${uniqueSuffix}${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          console.warn(`Falha ao enviar imagem "${nomeArquivo}" para o produto ${nome}:`, uploadError.message);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadData.path);

        const imageUrl = publicUrlData.publicUrl;

        const { error: imageError } = await supabase
          .from("product_images")
          .insert({
            product_id: createdProduct.id,
            image_url: imageUrl,
            is_primary: displayOrder === 0,
            display_order: displayOrder,
            alt_text: createdProduct.name,
          });

        if (imageError) {
          console.warn(`Falha ao registrar imagem no banco para o produto ${nome}:`, imageError.message);
        }

        displayOrder += 1;
      }
    } catch (err) {
      console.error("Erro ao importar produto do XML:", err);
    }
  }

  console.log("Importação concluída.");
}

main().catch((err) => {
  console.error("Erro geral na importação:", err);
  process.exit(1);
});

