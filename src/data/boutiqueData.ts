import { Loja, ServicoItem, Profissional } from '@/types/boutique'

export const LOJAS: Loja[] = [
  {
    id: 'vila-olimpia',
    nome: 'Vila Olímpia (SP)',
    cidade: 'São Paulo',
    bairro: 'Vila Olímpia',
    endereco: 'Rua Funchal, 418 — Vila Olímpia, São Paulo - SP',
    telefone: '(11) 3044-8900',
    whatsapp: '5511984521134',
    mapUrl: 'https://maps.google.com/?q=Rua+Funchal+418+Vila+Olimpia+Sao+Paulo',
  },
  {
    id: 'higienopolis',
    nome: 'Higienópolis (SP)',
    cidade: 'São Paulo',
    bairro: 'Higienópolis',
    endereco: 'Av. Higienópolis, 618 — Higienópolis, São Paulo - SP',
    telefone: '(11) 3825-7200',
    whatsapp: '5511971204498',
    mapUrl: 'https://maps.google.com/?q=Av+Higienopolis+618+Sao+Paulo',
  },
  {
    id: 'moema',
    nome: 'Moema (SP)',
    cidade: 'São Paulo',
    bairro: 'Moema',
    endereco: 'Av. Moema, 310 — Moema, São Paulo - SP',
    telefone: '(11) 5051-6400',
    whatsapp: '5511988992200',
    mapUrl: 'https://maps.google.com/?q=Av+Moema+310+Sao+Paulo',
  },
  {
    id: 'tatuape',
    nome: 'Tatuapé (SP)',
    cidade: 'São Paulo',
    bairro: 'Tatuapé',
    endereco: 'Rua Emílio Mallet, 875 — Tatuapé, São Paulo - SP',
    telefone: '(11) 2092-4100',
    whatsapp: '5511977663311',
    mapUrl: 'https://maps.google.com/?q=Rua+Emilio+Mallet+875+Tatuape+Sao+Paulo',
  },
  {
    id: 'alphaville',
    nome: 'Alphaville (Barueri)',
    cidade: 'Barueri',
    bairro: 'Alphaville',
    endereco: 'Al. Rio Negro, 1030 — Alphaville, Barueri - SP',
    telefone: '(11) 4195-2300',
    whatsapp: '5511996338821',
    mapUrl: 'https://maps.google.com/?q=Alameda+Rio+Negro+1030+Alphaville+Barueri',
  },
  {
    id: 'santana-de-parnaiba',
    nome: 'Santana de Parnaíba',
    cidade: 'Santana de Parnaíba',
    bairro: 'Tamboré',
    endereco: 'Av. Marcos Penteado de Ulhôa Rodrigues, 3800 — Santana de Parnaíba - SP',
    telefone: '(11) 4153-8800',
    whatsapp: '5511985551234',
    mapUrl: 'https://maps.google.com/?q=Av+Marcos+Penteado+de+Ulhoa+Rodrigues+Santana+de+Parnaiba',
  },
  {
    id: 'guarulhos',
    nome: 'Guarulhos',
    cidade: 'Guarulhos',
    bairro: 'Bosque Maia',
    endereco: 'Av. Paulo Faccini, 1420 — Bosque Maia, Guarulhos - SP',
    telefone: '(11) 2440-9700',
    whatsapp: '5511973335544',
    mapUrl: 'https://maps.google.com/?q=Av+Paulo+Faccini+1420+Guarulhos',
  },
]

export const SERVICOS: ServicoItem[] = [
  {
    id: 'atendimento-personalizado',
    titulo: 'Atendimento Personalizado',
    descricao:
      'Consultoria exclusiva com especialistas dedicados para alinhar estética, técnica e orçamento.',
    icone: 'Sparkles',
    destaque: 'Consultoria Individual',
  },
  {
    id: 'projeto-revestimentos',
    titulo: 'Projeto de Revestimentos',
    descricao:
      'Seleção minuciosa de materiais para pisos, paredes e fachadas em projetos de alto padrão.',
    icone: 'LayoutGrid',
    destaque: 'Paginação & Detalhamento',
  },
  {
    id: 'ampla-vitrine-premium',
    titulo: 'Ampla Vitrine Premium',
    descricao:
      'Mostruário físico completo com +500 materiais em grandes formatos, mármores e pedras nobres.',
    icone: 'Gem',
    destaque: '+500 Materiais Nobres',
  },
  {
    id: 'metais-acabamentos',
    titulo: 'Metais e Acabamentos',
    descricao:
      'Linhas exclusivas de metais de design para banheiros, lavabos e cozinhas sofisticadas.',
    icone: 'Wrench',
    destaque: 'Design Internacional',
  },
  {
    id: 'amostras-domicilio',
    titulo: 'Amostras em Domicílio',
    descricao:
      'Envio de amostras selecionadas diretamente à sua residência ou canteiro para teste de luz natural.',
    icone: 'PackageCheck',
    destaque: 'Avaliação in loco',
  },
  {
    id: 'assessoria-profissionais',
    titulo: 'Assessoria para Profissionais',
    descricao:
      'Suporte técnico contínuo para escritórios de arquitetura, designers de interiores e construtoras.',
    icone: 'Compass',
    destaque: 'Parceria com Arquitetos',
  },
]

export const PROFISSIONAIS: Profissional[] = [
  {
    id: 'helena-martins',
    nome: 'Helena Martins',
    cargo: 'Especialista em Revestimentos',
    experiencia: '15 anos de experiência',
    bio: 'Pós-graduada em Arquitetura de Interiores pela FAU-USP. Especialista em grandes formatos e pedras naturais translúcidas para residências de alto padrão.',
    lojaBase: 'Vila Olímpia & Higienópolis',
    foto: 'https://img.usecurling.com/ppl/medium?gender=female&seed=42',
  },
  {
    id: 'ricardo-salles',
    nome: 'Ricardo Salles',
    cargo: 'Consultor de Metais e Acabamentos',
    experiencia: '12 anos de experiência',
    bio: 'Engenheiro de materiais com formação internacional. Foco em soluções de metais escovados, pvd e louças de design italiano contemporâneo.',
    lojaBase: 'Moema & Tatuapé',
    foto: 'https://img.usecurling.com/ppl/medium?gender=male&seed=87',
  },
  {
    id: 'camila-duarte',
    nome: 'Camila Duarte',
    cargo: 'Designer de Interiores',
    experiencia: '10 anos de experiência',
    bio: 'Desenvolve paginações orgânicas combinando texturas minerais, madeira e porcelanatos slim com iluminação indireta cenográfica.',
    lojaBase: 'Alphaville & Santana de Parnaíba',
    foto: 'https://img.usecurling.com/ppl/medium?gender=female&seed=19',
  },
  {
    id: 'andre-ramos',
    nome: 'André Ramos',
    cargo: 'Gerente de Loja — Vila Olímpia',
    experiencia: '8 anos na rede',
    bio: 'Lidera o atendimento executivo e o canal exclusivo para grandes escritórios de arquitetura e projetos residenciais no eixo Faria Lima.',
    lojaBase: 'Vila Olímpia (SP)',
    foto: 'https://img.usecurling.com/ppl/medium?gender=male&seed=33',
  },
]

export const HORARIOS_ATENDIMENTO = {
  dias: 'Segunda a Sábado',
  horario: '09h às 18h',
  descricao:
    'Atendimento com horário marcado para garantir dedicação exclusiva e sala de especificações reservada.',
}

export const HORARIOS_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
]
