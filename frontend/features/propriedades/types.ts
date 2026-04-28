export type PropertyStatus = 'ativo' | 'inativo' | 'em_analise' | null;

export type PropertyRow = {
  id: number;
  nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  bairro: string | null;
  referencia: string | null;
  como_chegar: string | null;
  telefone: string | null;
  latitude: number | null;
  longitude: number | null;
  area_total: number | null;
  car: string | null;
  status_propriedade: PropertyStatus;
  status_arrendamento: string | null;
  produtores:
    | {
        nome: string | null;
        telefone: string | null;
        email: string | null;
        cpf_cnpj: string | null;
      }
    | null;
};

export type FilterValue = 'todos' | 'ativo' | 'em_analise' | 'inativo';

export type CoordinateKind = 'latitude' | 'longitude';

export type RawPropertyRow = Omit<PropertyRow, 'latitude' | 'longitude'> & {
  latitude: number | string | null;
  longitude: number | string | null;
};

export type OwnerForm = {
  nome: string;
  email: string;
  telefone: string;
  cpfCnpj: string;
  senha: string;
};

export type ProprietarioOption = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
};
