// Classifica o item de um edital em papelaria, informática ou armarinho pelo nome do produto.
// Não usa catálogo nem estoque: só o que o edital descreve.
// Regra: o produto precisa estar no INÍCIO da descrição (1º ou 2º termo), para não casar "papel" em "caixa de papelão".
// Termos "claros" geram correspondência provável; termos "ambíguos" geram só "possível" (não contam para a relevância).

export const CATEGORIAS = {
  papelaria: 'Papelaria',
  informatica: 'Informática',
  armarinho: 'Armarinho',
}

const CLAROS = {
  papelaria: [
    'caneta', 'lapis', 'lapiseira', 'grafite', 'borracha escolar', 'borracha', 'apontador', 'estilete', 'tesoura', 'cola branca', 'cola bastao',
    'cola quente', 'cola', 'fita adesiva', 'fita crepe', 'fita dupla face', 'fita corretiva', 'corretivo', 'clipe', 'clips', 'grampo', 'grampeador',
    'extrator grampo', 'perfurador', 'furador', 'envelope', 'papel sulfite', 'papel a4', 'papel a3', 'papel oficio', 'papel carbono', 'papel vegetal',
    'papel kraft', 'papel contact', 'papel fotografico', 'papel couche', 'papel cartao', 'papel crepom', 'papel camurca', 'papel color', 'papel',
    'cartolina', 'caderno', 'bloco anotacao', 'bloco nota', 'bloco recado', 'bloco adesivo', 'bloco rascunho', 'bloco post', 'post it', 'marcador texto',
    'marca texto', 'marcador permanente', 'marcador quadro', 'marcador', 'pincel atomico', 'pincel', 'giz', 'quadro branco', 'apagador', 'regua', 'compasso',
    'esquadro', 'transferidor', 'calculadora', 'agenda', 'livro ata', 'livro ponto', 'livro protocolo', 'livro registro', 'etiqueta', 'prancheta',
    'caixa arquivo', 'pasta suspensa', 'pasta catalogo', 'pasta classificador', 'pasta arquivo', 'pasta az', 'pasta sanfonada', 'classificador',
    'separador', 'indice', 'colchete', 'elastico dinheiro', 'corretivo liquido', 'carimbo', 'almofada carimbo', 'tinta carimbo', 'massa modelar',
    'eva', 'folha eva', 'tinta guache', 'tinta tempera', 'estojo', 'mochila', 'lancheira', 'fragmentadora', 'guilhotina', 'encadernadora', 'plastificadora',
    'plastico encadernacao', 'espiral encadernacao', 'refil', 'porta caneta', 'porta lapis', 'porta clipe', 'organizador mesa', 'bandeja papel', 'grampo trilho',
    'barbante', 'cola isopor', 'caneta marca', 'quadro aviso', 'mural', 'pasta l', 'pasta polionda', 'saco plastico', 'protetor folha', 'tinta almofada',
  ],
  informatica: [
    'mouse', 'teclado', 'monitor', 'webcam', 'headset', 'fone ouvido', 'pendrive', 'pen drive', 'hd externo', 'hd', 'ssd', 'memoria ram', 'memoria',
    'processador', 'placa mae', 'placa video', 'cooler', 'gabinete', 'cabo hdmi', 'cabo usb', 'cabo rede', 'cabo vga', 'cabo displayport', 'cabo lan',
    'cabo rj45', 'cabo forca', 'cabo extensor', 'notebook', 'computador', 'microcomputador', 'desktop', 'tablet', 'impressora', 'multifuncional', 'scanner',
    'toner', 'cartucho', 'refil tinta', 'tinta impressora', 'nobreak', 'no break', 'estabilizador', 'filtro linha', 'projetor', 'mousepad', 'mouse pad',
    'suporte monitor', 'suporte notebook', 'leitor codigo', 'leitor barras', 'cartao memoria', 'roteador', 'access point', 'switch', 'hub usb', 'dock',
    'docking', 'carregador notebook', 'carregador celular', 'adaptador usb', 'adaptador hdmi', 'adaptador bluetooth', 'adaptador wifi', 'pasta termica',
    'cabo adaptador', 'caixa som', 'caixa acustica', 'microfone', 'camera', 'tela projecao', 'ponteira laser', 'apresentador', 'teclado mouse',
    'kit teclado', 'cartucho tinta', 'fita impressora', 'etiqueta termica', 'bobina termica', 'drive', 'leitor cartao', 'telefone ip', 'servidor', 'storage',
  ],
  armarinho: [
    'linha costura', 'linha bordar', 'linha croche', 'linha', 'agulha', 'alfinete', 'botao', 'ziper', 'fita cetim', 'fita gorgurao', 'fita decorativa',
    'fita metrica', 'fita sinete', 'elastico', 'renda', 'tecido', 'tnt', 'feltro', 'retalho', 'fivela', 'ilhos', 'velcro', 'lantejoula', 'micanga',
    'cordao', 'la', 'croche', 'bordado', 'bastidor', 'dedal', 'vies', 'entretela', 'cadarco', 'aviamento', 'necessaire', 'trico', 'barbante croche',
    'fio', 'fita', 'passamanaria', 'galao', 'paetê', 'strass', 'cola tecido', 'tesoura costura', 'tesoura picotar', 'manta acrilica', 'fibra siliconada',
  ],
}

// Termos que, sozinhos, são ambíguos (podem ser de outro ramo): contam só como "possível".
const AMBIGUOS = new Set([
  'cola', 'pasta l', 'fio', 'fita', 'la', 'linha', 'refil', 'marcador', 'giz', 'pincel', 'eva', 'mural', 'drive', 'switch', 'dock', 'cooler', 'gabinete',
  'memoria', 'hd', 'camera', 'servidor', 'storage', 'monitor', 'galao', 'elastico', 'indice', 'separador', 'classificador', 'colchete', 'barbante', 'papel',
  'carimbo', 'agenda', 'etiqueta', 'mochila', 'estojo', 'tesoura', 'grampo', 'clips', 'regua',
])

// Palavras que, no início da descrição, mostram que o item é de outro ramo.
const EXCLUIR = new Set([
  'higienico', 'toalha', 'aluminio', 'dente', 'parede', 'automotivo', 'veiculo', 'medicamento', 'hospitalar', 'cirurgico', 'ortopedico', 'odontologico',
  'jardim', 'poda', 'cozinha', 'churrasco', 'alimentar', 'alimento', 'bebida', 'limpeza', 'detergente', 'sabao', 'desinfetante',
])

const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'sem', 'e', 'em', 'a', 'o', 'as', 'os', 'tipo', 'cor', 'modelo', 'marca', 'similar', 'ou', 'um', 'uma', 'no', 'na', 'ate', 'por'])
const sem = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function tokens(t) {
  return (sem(t).match(/[a-z0-9]+/g) || []).filter((x) => (x.length > 1 || x === 'a') && !PARADAS.has(x)).map((x) => (x.length > 3 && x.endsWith('s') && !x.endsWith('ss') ? x.slice(0, -1) : x))
}

// Em itens de "LOTE ... - Produto", o produto é o último trecho depois do hífen.
export function nucleo(d) {
  const s = String(d ?? '')
  const partes = s.split(/\s-\s/)
  return /^\s*lote\b/i.test(s) && partes.length > 1 ? partes[partes.length - 1] : s
}

// Termos já em forma de tokens, do mais comprido para o mais curto (o termo mais específico vence).
const TERMOS = Object.entries(CLAROS)
  .flatMap(([categoria, lista]) => lista.map((termo) => ({ categoria, termo, chave: termo, tk: tokens(termo) })))
  .filter((t) => t.tk.length > 0)
  .sort((a, b) => b.tk.length - a.tk.length)

const comeca = (janela, tk, inicio) => tk.every((x, i) => janela[inicio + i] === x)

// Devolve { categoria, rotulo, termo, nivel } ou null.
export function classificarItem(descricao) {
  const todos = tokens(nucleo(descricao))
  const janela = todos.slice(0, 6)
  if (janela.length === 0) return null
  if (janela.some((x) => EXCLUIR.has(x))) return null
  for (const t of TERMOS) {
    for (let inicio = 0; inicio <= 1; inicio += 1) {
      if (!comeca(janela, t.tk, inicio)) continue
      return { categoria: t.categoria, rotulo: CATEGORIAS[t.categoria], termo: t.termo, nivel: AMBIGUOS.has(t.termo) ? 'possivel' : 'provavel' }
    }
  }
  return null
}
