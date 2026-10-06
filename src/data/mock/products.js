import { createProduct } from '../../features/catalog/model/product.js'

const informationSource = 'Lista informada pelo proprietário — a validar'
const informationDate = 'Não informado'
const unknown = 'Não informado'

const itemsByCategory = {
  'Material Escolar': [
    ['Caderno', 'Papel e cadernos'], ['Lápis', 'Escrita'], ['Caneta', 'Escrita'], ['Borracha', 'Acessórios'],
    ['Apontador', 'Acessórios'], ['Cola', 'Acessórios'], ['Régua', 'Acessórios'], ['Lápis de cor', 'Desenho'],
  ],
  'Armarinho & Tecidos': [
    ['Barbante', 'Fios'], ['Linha para costura', 'Fios'], ['Fita', 'Aviamentos'], ['Botão', 'Aviamentos'],
    ['Elástico', 'Aviamentos'], ['Viés', 'Aviamentos'], ['Agulha', 'Costura'], ['Alfinete', 'Costura'],
    ['Tesoura', 'Ferramentas'], ['Tecido', 'Tecidos'],
  ],
  Escritório: [
    ['Papel A4', 'Papéis'], ['Pasta', 'Organização'], ['Clips', 'Acessórios'], ['Grampeador', 'Fixação'],
    ['Grampos', 'Fixação'], ['Marcador', 'Escrita'], ['Calculadora', 'Acessórios'], ['Organizador', 'Organização'],
  ],
  'Papelaria Criativa': [
    ['EVA', 'Papéis e materiais criativos'], ['Cartolina', 'Papéis e materiais criativos'],
    ['Papel colorido', 'Papéis e materiais criativos'], ['Bloco de papel', 'Papel e blocos'], ['Papel cartão', 'Papéis e materiais criativos'],
  ],
  'Presentes & Utilidades': [
    ['Embalagem para presente', 'Embalagens'], ['Sacola', 'Embalagens'], ['Lembrancinha', 'Presentes'], ['Utilidade doméstica', 'Utilidades'],
  ],
}

export const products = Object.entries(itemsByCategory).flatMap(([category, items]) =>
  items.map(([name, subcategory], index) => createProduct({
    id: `reference-${category.toLocaleLowerCase('pt-BR').replaceAll(/[^a-z0-9]+/g, '-')}-${index + 1}`,
    name,
    category,
    subcategory,
    description: unknown,
    unitOfSale: unknown,
    specifications: unknown,
    brands: unknown,
    stock: unknown,
    cost: unknown,
    salePrice: unknown,
    suppliers: unknown,
    informationSource,
    informationDate,
    confidenceLevel: 'Referência',
    status: 'Demonstração — catálogo de referência',
  })),
)
