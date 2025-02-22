import { Injectable } from '@nestjs/common';
import { FonteRelatorio } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRelIndicadorDto } from '../indicadores/dto/create-indicadore.dto';
import { CreateRelMonitoramentoMensalDto } from '../monitoramento-mensal/dto/create-monitoramento-mensal.dto';
import { PdmCreateOrcamentoExecutadoDto as CreateRelPdmOrcamentoExecutadoDto } from '../orcamento/dto/create-orcamento-executado.dto';
import { CreateRelProjetoDto } from '../pp-projeto/dto/create-previsao-custo.dto';
import { CreateRelProjetosDto } from '../pp-projetos/dto/create-projetos.dto';
import { CreateRelProjetoStatusDto } from '../pp-status/dto/create-projeto-status.dto';
import { CreateRelPrevisaoCustoDto as CreateRelPdmPrevisaoCustoDto } from '../previsao-custo/dto/create-previsao-custo.dto';
import { CreateRelProjetoOrcamentoDto } from '../projeto-orcamento/dto/create-projeto-orcamento.dto';
import { CreateRelProjetoPrevisaoCustoDto } from '../projeto-previsao-custo/dto/create-projeto-previsao-custo.dto';
import { FiltroMetasIniAtividadeDto } from '../relatorios/dto/filtros.dto';

@Injectable()
export class UtilsService {
    constructor(private readonly prisma: PrismaService) {}

    async applyFilter(filters: FiltroMetasIniAtividadeDto, getResult: { atividades: boolean; iniciativas: boolean }) {
        const tags = Array.isArray(filters.tags) && filters.tags.length > 0 ? filters.tags : [];

        const metas = await this.prisma.meta.findMany({
            where: {
                pdm_id: filters.pdm_id,
                removido_em: null,
                AND: [
                    { id: filters.meta_id ? filters.meta_id : undefined },
                    { id: filters.metas_ids && filters.metas_ids.length > 0 ? { in: filters.metas_ids } : undefined },
                ],
                meta_tag: tags.length === 0 ? undefined : { some: { tag_id: { in: tags } } },
            },
            select: { id: true },
        });

        // aqui há uma duvida, se devemos buscar as iniciativas q deram match nas metas, ou se pelo filtro
        const iniciativas = getResult.iniciativas
            ? await this.prisma.iniciativa.findMany({
                  where: {
                      meta_id: { in: metas.map((r) => r.id) },
                      removido_em: null,
                      id: filters.meta_id ? filters.meta_id : undefined,
                      iniciativa_tag: tags.length === 0 ? undefined : { some: { tag_id: { in: tags } } },
                  },
                  select: { id: true },
              })
            : [];

        const atividades = getResult.atividades
            ? await this.prisma.atividade.findMany({
                  where: {
                      iniciativa_id: { in: iniciativas.map((r) => r.id) },
                      removido_em: null,
                      id: filters.meta_id ? filters.meta_id : undefined,
                      atividade_tag: tags.length === 0 ? undefined : { some: { tag_id: { in: tags } } },
                  },
                  select: { id: true },
              })
            : [];

        return {
            atividades,
            iniciativas,
            metas,
        };
    }
}

export class FileOutput {
    name: string;
    buffer: Buffer;
}

export interface ReportableService {
    getFiles(output: any, pdm_id: number | null, params: any): Promise<FileOutput[]>;
    create(params: any): Promise<any>;
}

export function ParseParametrosDaFonte(fonte: FonteRelatorio, value: any): any {
    let theClass: any = undefined;

    switch (fonte) {
        case 'Orcamento':
            theClass = CreateRelPdmOrcamentoExecutadoDto;
            break;
        case 'ProjetoOrcamento':
            theClass = CreateRelProjetoOrcamentoDto;
            break;
        case 'Indicadores':
            theClass = CreateRelIndicadorDto;
            break;
        case 'MonitoramentoMensal':
            theClass = CreateRelMonitoramentoMensalDto;
            break;
        case 'PrevisaoCusto':
            theClass = CreateRelPdmPrevisaoCustoDto;
            break;
        case 'ProjetoPrevisaoCusto':
            theClass = CreateRelProjetoPrevisaoCustoDto;
            break;
        case 'Projeto':
            theClass = CreateRelProjetoDto;
            break;
        case 'Projetos':
            theClass = CreateRelProjetosDto;
            break;
        case 'ProjetoStatus':
            theClass = CreateRelProjetoStatusDto;
            break;
        default:
            return false;
    }
    const validatorObject = plainToInstance(theClass, value);

    return validatorObject;
}

export const DefaultCsvOptions = {
    excelStrings: false,
    eol: '\r\n',
    withBOM: false, // dont be evil!
};
