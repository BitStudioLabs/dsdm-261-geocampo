export interface Regiao {
  id: number;
  nome: string;
  uf: string;
}

export interface Municipio {
  id: number;
  nome: string;
  uf: string;
}

export interface ProprietarioOption {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
}

export type StatusProp = 'ativo' | 'inativo' | 'em_analise';
export type StatusArr = 'nao_arrendada' | 'arrendada' | 'parcialmente_arrendada';

export interface PropForm {
  nome: string;
  imovel: string;
  car: string;
  inscricaoIncra: string;
  dap: string;
  municipio: Municipio | null;
  regiao: Regiao | null;
  uf: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  referencia: string;
  comoChegar: string;
  latitude: string;
  longitude: string;
  areaTotal: string;
  areaAtividades: string;
  areaPecuaria: string;
  areaPreservacao: string;
  areaReserva: string;
  areaVegetacao: string;
  areaAcudes: string;
  areaBenfeitorias: string;
  areaEstradas: string;
  areaGraos: string;
  areaNaoAgricola: string;
  valorTerraNua: string;
  statusProp: StatusProp;
  statusArr: StatusArr;
  telefone: string;
}

export interface OwnerForm {
  nome: string;
  email: string;
  telefone: string;
  cpfCnpj: string;
  senha: string;
}

export interface LoadedPropertyRow {
  id: number;
  nome: string | null;
  imovel: string | null;
  car: string | null;
  inscricao_incra: string | null;
  dap: string | null;
  id_municipio: number | null;
  municipio_nome: string | null;
  uf: string | null;
  id_regional: number | null;
  bairro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  referencia: string | null;
  como_chegar: string | null;
  latitude: number | null;
  longitude: number | null;
  area_total: number | null;
  area_atividades_prod: number | null;
  area_pecuaria: number | null;
  area_preservacao_perm: number | null;
  area_reserva_legal: number | null;
  area_vegetacao_nativa: number | null;
  area_acudes_represas: number | null;
  area_benfeitorias: number | null;
  area_estradas: number | null;
  area_graos_cereais: number | null;
  area_nao_agricola: number | null;
  valor_terra_nua: number | null;
  status_propriedade: StatusProp;
  status_arrendamento: StatusArr;
  telefone: string | null;
  id_produtor: number | null;
  produtores:
    | {
        nome: string | null;
        telefone: string | null;
        email: string | null;
        cpf_cnpj: string | null;
        usuario_id: string | null;
      }
    | null;
}

export type CadastroPropriedadeFeedback = {
  type: 'success' | 'error';
  message: string;
} | null;

export const PROP0: PropForm = {
  nome: '',
  imovel: '',
  car: '',
  inscricaoIncra: '',
  dap: '',
  municipio: null,
  regiao: null,
  uf: 'TO',
  bairro: '',
  logradouro: '',
  numero: '',
  complemento: '',
  cep: '',
  referencia: '',
  comoChegar: '',
  latitude: '',
  longitude: '',
  areaTotal: '',
  areaAtividades: '',
  areaPecuaria: '',
  areaPreservacao: '',
  areaReserva: '',
  areaVegetacao: '',
  areaAcudes: '',
  areaBenfeitorias: '',
  areaEstradas: '',
  areaGraos: '',
  areaNaoAgricola: '',
  valorTerraNua: '',
  statusProp: 'ativo',
  statusArr: 'nao_arrendada',
  telefone: '',
};

export const OWNER0: OwnerForm = {
  nome: '',
  email: '',
  telefone: '',
  cpfCnpj: '',
  senha: '',
};
