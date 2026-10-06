import { createOpportunity } from '../../features/opportunities/model/opportunity.js'

const simulatedSource = 'Base fictícia R W Gov'
const capturedAt = '2026-10-05T09:00:00-03:00'

export const mockOpportunities = [
  {
    id: 'demo-opp-001', processNumber: 'PE 041/2026', title: 'Materiais de escritório para unidades administrativas',
    agency: 'Prefeitura Municipal de Campinas', city: 'Campinas', state: 'SP', modality: 'Pregão eletrônico',
    status: 'Aberta', category: 'Material de escritório', estimatedValue: 48500, publishedAt: '2026-09-29',
    sessionAt: '2026-10-14T09:00:00-03:00', itemCount: 28, summary: 'Aquisição parcelada de papel, pastas, canetas e materiais de expediente para atendimento das secretarias municipais.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-002', processNumber: 'PE 118/2026', title: 'Kits de material escolar para rede municipal',
    agency: 'Secretaria Municipal de Educação de Jundiaí', city: 'Jundiaí', state: 'SP', modality: 'Pregão eletrônico',
    status: 'Recebendo propostas', category: 'Material escolar', estimatedValue: 186200, publishedAt: '2026-09-24',
    sessionAt: '2026-10-09T10:00:00-03:00', itemCount: 16, summary: 'Kits escolares com cadernos, lápis, borrachas, réguas e itens de apoio para estudantes da rede pública.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-003', processNumber: 'DL 077/2026', title: 'Papel sulfite e consumíveis de expediente',
    agency: 'Universidade Estadual de Londrina', city: 'Londrina', state: 'PR', modality: 'Dispensa eletrônica',
    status: 'Aberta', category: 'Papelaria', estimatedValue: 27300, publishedAt: '2026-10-01',
    sessionAt: '2026-10-08T14:00:00-03:00', itemCount: 9, summary: 'Fornecimento de papel sulfite A4, envelopes e materiais básicos para setores administrativos.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-004', processNumber: 'PE 203/2026', title: 'Tecidos e aviamentos para oficinas comunitárias',
    agency: 'Prefeitura Municipal de Sorocaba', city: 'Sorocaba', state: 'SP', modality: 'Pregão eletrônico',
    status: 'Em análise', category: 'Tecidos', estimatedValue: 64900, publishedAt: '2026-09-20',
    sessionAt: '2026-10-20T09:30:00-03:00', itemCount: 22, summary: 'Tecidos planos, malhas e materiais de costura destinados a oficinas de capacitação e projetos sociais.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-005', processNumber: 'PE 056/2026', title: 'Livros paradidáticos para bibliotecas escolares',
    agency: 'Consórcio Intermunicipal do Vale do Ivaí', city: 'Apucarana', state: 'PR', modality: 'Pregão eletrônico',
    status: 'Aberta', category: 'Livros', estimatedValue: 93500, publishedAt: '2026-09-26',
    sessionAt: '2026-10-16T09:00:00-03:00', itemCount: 34, summary: 'Aquisição de títulos de literatura infantil e juvenil para ampliação dos acervos das bibliotecas municipais.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-006', processNumber: 'DL 142/2026', title: 'Armarinho e aviamentos para projetos de artesanato',
    agency: 'Fundação de Ação Social de Curitiba', city: 'Curitiba', state: 'PR', modality: 'Dispensa eletrônica',
    status: 'Recebendo propostas', category: 'Armarinho / aviamentos', estimatedValue: 18300, publishedAt: '2026-10-02',
    sessionAt: '2026-10-10T08:30:00-03:00', itemCount: 41, summary: 'Linhas, botões, zíperes, fitas e itens de armarinho para atividades de inclusão produtiva.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-007', processNumber: 'PE 331/2026', title: 'Materiais diversos para unidades de atendimento',
    agency: 'Prefeitura Municipal de Belo Horizonte', city: 'Belo Horizonte', state: 'MG', modality: 'Pregão eletrônico',
    status: 'Encerrada', category: 'Materiais diversos', estimatedValue: 241700, publishedAt: '2026-08-18',
    sessionAt: '2026-09-12T09:00:00-03:00', itemCount: 57, summary: 'Materiais de apoio administrativo, organização e consumo para centros de atendimento municipais.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-008', processNumber: 'PE 089/2026', title: 'Papelaria e materiais para atividades pedagógicas',
    agency: 'Prefeitura Municipal de Maringá', city: 'Maringá', state: 'PR', modality: 'Pregão eletrônico',
    status: 'Aberta', category: 'Papelaria', estimatedValue: 117600, publishedAt: '2026-09-30',
    sessionAt: '2026-10-22T10:00:00-03:00', itemCount: 31, summary: 'Materiais de papelaria, cartolinas e itens de apoio para atividades pedagógicas em escolas municipais.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-009', processNumber: 'PE 014/2026', title: 'Uniformes e tecidos para equipes de campo',
    agency: 'Autarquia Municipal de Serviços de Ponta Grossa', city: 'Ponta Grossa', state: 'PR', modality: 'Concorrência eletrônica',
    status: 'Em análise', category: 'Tecidos', estimatedValue: 358400, publishedAt: '2026-09-12',
    sessionAt: '2026-10-28T09:00:00-03:00', itemCount: 12, summary: 'Aquisição de tecidos e materiais para confecção de uniformes de equipes operacionais.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
  {
    id: 'demo-opp-010', processNumber: 'PE 225/2026', title: 'Livros e materiais de leitura complementar',
    agency: 'Secretaria de Educação de Ribeirão Preto', city: 'Ribeirão Preto', state: 'SP', modality: 'Pregão eletrônico',
    status: 'Aberta', category: 'Livros', estimatedValue: 78200, publishedAt: '2026-10-03',
    sessionAt: '2026-11-04T09:00:00-03:00', itemCount: 19, summary: 'Livros de apoio e leitura complementar para programas de incentivo à leitura.',
    source: simulatedSource, capturedAt, dataConfidence: 'Simulado',
  },
]

export const opportunities = mockOpportunities.map((record) => createOpportunity(record))
