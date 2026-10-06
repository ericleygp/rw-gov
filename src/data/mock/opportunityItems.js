import { createOpportunityItem } from '../../features/opportunities/model/opportunityItem.js'

const informationSource = 'Demonstração — item fictício'
const informationDate = '2026-10-06'
const unknown = 'não informado'

const itemRecords = [
  {
    id: 'demo-item-001-01', opportunityId: 'demo-opp-001', itemNumber: 1,
    originalDescription: 'Papel sulfite formato A4, branco, gramatura 75 g/m², pacote com 500 folhas.',
    quantity: 200, supplyUnit: 'resma', specifications: { gramatura: '75 g/m²', dimensoes: 'A4', cor: 'branca', material: 'papel', quantidadePorEmbalagem: '500 folhas' }, declaredCategory: 'Material de escritório',
  },
  {
    id: 'demo-item-001-02', opportunityId: 'demo-opp-001', itemNumber: 2,
    originalDescription: 'Caneta esferográfica azul, corpo plástico, escrita média.',
    quantity: 500, supplyUnit: 'unidade', specifications: { cor: 'azul', material: 'plástico', outras: 'gramatura, dimensões e embalagem não especificadas no item demonstrativo' }, declaredCategory: 'Material de escritório',
  },
  {
    id: 'demo-item-001-03', opportunityId: 'demo-opp-001', itemNumber: 3,
    originalDescription: 'Pasta classificadora com elástico, tamanho ofício.',
    quantity: 120, supplyUnit: 'unidade', specifications: { dimensoes: 'ofício', material: unknown, cor: unknown }, declaredCategory: 'Material de escritório',
  },
  {
    id: 'demo-item-002-01', opportunityId: 'demo-opp-002', itemNumber: 1,
    originalDescription: 'Caderno escolar brochura, 96 folhas, capa flexível, formato aproximado 200 x 275 mm.',
    quantity: 1200, supplyUnit: 'unidade', specifications: { dimensoes: '200 x 275 mm (aproximadas)', material: 'papel', quantidadePorEmbalagem: '96 folhas', outras: 'tipo de pauta e cor não informados' }, declaredCategory: 'Material escolar',
  },
  {
    id: 'demo-item-002-02', opportunityId: 'demo-opp-002', itemNumber: 2,
    originalDescription: 'Lápis de cor, caixa com 12 cores, formato sextavado.',
    quantity: 450, supplyUnit: 'caixa', specifications: { material: 'madeira', quantidadePorEmbalagem: '12 unidades', outras: 'marca e dimensões não informadas' }, declaredCategory: 'Material escolar',
  },
  {
    id: 'demo-item-002-03', opportunityId: 'demo-opp-002', itemNumber: 3,
    originalDescription: 'Material escolar diversos conforme necessidade das unidades participantes.',
    quantity: 80, supplyUnit: 'kit', specifications: { gramatura: unknown, dimensoes: unknown, cor: unknown, material: unknown, quantidadePorEmbalagem: unknown, outras: 'descrição intencionalmente ambígua nesta demonstração' }, declaredCategory: 'Material escolar',
  },
  {
    id: 'demo-item-003-01', opportunityId: 'demo-opp-003', itemNumber: 1,
    originalDescription: 'Papel A4 branco, 75 g/m², embalagem com 500 folhas.',
    quantity: 90, supplyUnit: 'resma', specifications: { gramatura: '75 g/m²', dimensoes: 'A4', cor: 'branca', material: 'papel', quantidadePorEmbalagem: '500 folhas' }, declaredCategory: 'Papelaria',
  },
  {
    id: 'demo-item-003-02', opportunityId: 'demo-opp-003', itemNumber: 2,
    originalDescription: 'Envelope para correspondência, dimensões e cor não especificadas.',
    quantity: 300, supplyUnit: 'unidade', specifications: { dimensoes: unknown, cor: unknown, material: unknown }, declaredCategory: 'Papelaria',
  },
  {
    id: 'demo-item-004-01', opportunityId: 'demo-opp-004', itemNumber: 1,
    originalDescription: 'Tecido plano para uso em oficina, composição e gramatura a confirmar.',
    quantity: 250, supplyUnit: 'metro', specifications: { gramatura: unknown, dimensoes: 'largura não informada', cor: unknown, material: unknown, outras: 'composição e gramatura a confirmar' }, declaredCategory: 'Tecidos',
  },
  {
    id: 'demo-item-004-02', opportunityId: 'demo-opp-004', itemNumber: 2,
    originalDescription: 'Linha para costura em carretel, cor variada.',
    quantity: 100, supplyUnit: 'carretel', specifications: { cor: 'variada', material: unknown, quantidadePorEmbalagem: unknown }, declaredCategory: 'Armarinho / aviamentos',
  },
  {
    id: 'demo-item-005-01', opportunityId: 'demo-opp-005', itemNumber: 1,
    originalDescription: 'Livro de literatura infantil em língua portuguesa, edição brochura.',
    quantity: 300, supplyUnit: 'exemplar', specifications: { material: 'papel', cor: unknown, outras: 'título, autoria e número de páginas não informados' }, declaredCategory: 'Livros',
  },
  {
    id: 'demo-item-006-01', opportunityId: 'demo-opp-006', itemNumber: 1,
    originalDescription: 'Fita de tecido para artesanato, cores variadas, rolo com 10 metros.',
    quantity: 60, supplyUnit: 'rolo', specifications: { cor: 'variada', material: 'tecido', quantidadePorEmbalagem: '10 metros', dimensoes: unknown }, declaredCategory: 'Armarinho / aviamentos',
  },
  {
    id: 'demo-item-006-02', opportunityId: 'demo-opp-006', itemNumber: 2,
    originalDescription: 'Botão para costura, tamanho e material não informados.',
    quantity: 500, supplyUnit: 'unidade', specifications: { dimensoes: unknown, material: unknown, cor: unknown }, declaredCategory: 'Armarinho / aviamentos',
  },
  {
    id: 'demo-item-007-01', opportunityId: 'demo-opp-007', itemNumber: 1,
    originalDescription: 'Organizador de mesa para materiais de escritório, especificação a confirmar.',
    quantity: 45, supplyUnit: 'unidade', specifications: { dimensoes: unknown, material: unknown, cor: unknown, outras: 'especificação a confirmar' }, declaredCategory: 'Materiais diversos',
  },
  {
    id: 'demo-item-008-01', opportunityId: 'demo-opp-008', itemNumber: 1,
    originalDescription: 'Cartolina colorida, dimensão aproximada 500 x 660 mm.',
    quantity: 600, supplyUnit: 'folha', specifications: { dimensoes: '500 x 660 mm (aproximadas)', cor: 'colorida', material: 'papel' }, declaredCategory: 'Papelaria',
  },
  {
    id: 'demo-item-008-02', opportunityId: 'demo-opp-008', itemNumber: 2,
    originalDescription: 'Cola branca para uso escolar, embalagem com conteúdo não informado.',
    quantity: 180, supplyUnit: 'unidade', specifications: { cor: 'branca', material: unknown, quantidadePorEmbalagem: unknown }, declaredCategory: 'Material escolar',
  },
  {
    id: 'demo-item-009-01', opportunityId: 'demo-opp-009', itemNumber: 1,
    originalDescription: 'Tecido para confecção de uniforme operacional, composição conforme especificação do órgão.',
    quantity: 800, supplyUnit: 'metro', specifications: { gramatura: unknown, dimensoes: 'largura não informada', cor: unknown, material: unknown, outras: 'composição conforme especificação fictícia do órgão' }, declaredCategory: 'Tecidos',
  },
  {
    id: 'demo-item-010-01', opportunityId: 'demo-opp-010', itemNumber: 1,
    originalDescription: 'Bloco de papel para atividades de leitura e escrita, formato não informado.',
    quantity: 120, supplyUnit: 'bloco', specifications: { gramatura: unknown, dimensoes: unknown, cor: unknown, material: 'papel', quantidadePorEmbalagem: unknown }, declaredCategory: 'Papelaria Criativa',
  },
]

export const opportunityItems = itemRecords.map((record) => createOpportunityItem({
  ...record,
  informationSource,
  informationDate,
  confidenceLevel: 'Referência',
  status: 'Demonstração',
}))
