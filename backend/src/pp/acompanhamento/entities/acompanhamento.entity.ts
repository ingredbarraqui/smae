export class ProjetoAcompanhamentoRowDto {
    encaminhamento: string | null
    responsavel: string | null
    prazo_encaminhamento: Date | null
    prazo_realizado: Date | null
    pauta: string | null
}

export class ProjetoAcompanhamento {
    id: number
    data_registro: Date
    participantes: string
    detalhamento: string | null
    risco: RiscoIdCod[] | null

    encaminhamentos: ProjetoAcompanhamentoRowDto[]
}

export class ListProjetoAcompanhamentoDto {
    linhas: ProjetoAcompanhamento[]
}

export class DetailProjetoAcompanhamentoDto {
    id: number
    data_registro: Date
    participantes: string
    detalhamento: string | null
    observacao: string | null
    detalhamento_status: string | null
    pontos_atencao: string | null
    cronograma_paralisado: boolean
    risco: RiscoIdCod[] | null

    encaminhamentos: ProjetoAcompanhamentoRowDto[]
}

export class RiscoIdCod {
    id: number
    codigo: number
}

