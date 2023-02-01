import { Injectable } from '@nestjs/common';
import { Pdm } from '@prisma/client';
import { MetasAnaliseQualiService } from '../../mf/metas/metas-analise-quali.service';
import { MetasFechamentoService } from '../../mf/metas/metas-fechamento.service';
import { MetasRiscoService } from '../../mf/metas/metas-risco.service';
import { PrismaService } from '../../prisma/prisma.service';

import { DefaultCsvOptions, FileOutput } from '../utils/utils.service';
import { CreateRelMonitoramentoMensalDto } from './dto/create-monitoramento-mensal.dto';
import { RelMfMetas, RetMonitoramentoFisico, RetMonitoramentoMensal } from './entities/monitoramento-mensal.entity';

const {
    Parser,
    transforms: { flatten },
} = require('json2csv');
const defaultTransform = [flatten({ paths: [] })];

class QualiCsv {
    informacoes_complementares: string;
    referencia_data: string;
    criado_em: string;
    criador_nome_exibicao: string;
    meta_id: string;
    meta_titulo: string;
    meta_codigo: string;
    id: string;
}

class RiscoCsv {
    detalhamento: string;
    ponto_de_atencao: string;
    referencia_data: string;
    criado_em: string;
    criador_nome_exibicao: string;
    meta_id: string;
    meta_titulo: string;
    meta_codigo: string;
    id: string;
}

class FechamentoCsv {
    comentario: string;
    referencia_data: string;
    criado_em: string;
    criador_nome_exibicao: string;
    meta_id: string;
    meta_titulo: string;
    meta_codigo: string;
    id: string;
}

@Injectable()
export class MonitoramentoMensalMfService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly analiseQuali: MetasAnaliseQualiService,
        private readonly analiseRisco: MetasRiscoService,
        private readonly fechamento: MetasFechamentoService,
    ) {}

    async create_mf(dto: CreateRelMonitoramentoMensalDto, metas: number[]): Promise<RetMonitoramentoFisico | null> {
        const cf = await this.prisma.cicloFisico.findFirst({
            where: {
                pdm_id: dto.pdm_id,
                data_ciclo: new Date([dto.ano, dto.mes, '01'].join('-')),
            },
        });
        if (!cf) return null;

        const metasOut: RelMfMetas[] = [];

        const metasDb = await this.prisma.meta.findMany({
            where: { id: { in: metas }, removido_em: null },
            select: { id: true, titulo: true, codigo: true },
        });

        for (const meta of metasDb) {
            const ret: RelMfMetas = {
                meta,
                analiseQuali: null,
                fechamento: null,
                analiseRisco: null,
            };
            const params = { ciclo_fisico_id: cf.id, meta_id: meta.id, apenas_ultima_revisao: true };

            // fazendo dessa forma o prisma pode fazer as queries em parelelo
            const results = await Promise.all([
                this.analiseQuali.getMetaAnaliseQualitativa(params, null, null),
                this.analiseRisco.getMetaRisco(params, null, null),
                this.fechamento.getMetaFechamento(params, null, null),
            ]);

            if (results[0].analises.length) ret.analiseQuali = results[0].analises[0];

            if (results[1].riscos.length) ret.analiseRisco = results[1].riscos[0];

            if (results[2].fechamentos) ret.fechamento = results[2].fechamentos[0];

            metasOut.push(ret);
        }

        return {
            ano: cf.data_ciclo.getFullYear(),
            mes: cf.data_ciclo.getMonth(),
            ciclo_fisico_id: cf.id,
            metas: metasOut,
        };
    }

    async getFiles(myInput: RetMonitoramentoMensal, pdm: Pdm): Promise<FileOutput[]> {
        const out: FileOutput[] = [];
        if (!myInput.monitoramento_fisico || myInput.monitoramento_fisico.metas.length == 0) return [];

        const qualiRows: QualiCsv[] = [];
        const riscoRows: RiscoCsv[] = [];
        const fechamentoRows: FechamentoCsv[] = [];
        for (const meta of myInput.monitoramento_fisico.metas) {
            if (meta.analiseQuali) {
                qualiRows.push({
                    id: meta.analiseQuali.id.toString(),
                    criador_nome_exibicao: meta.analiseQuali.criador.nome_exibicao,
                    criado_em: meta.analiseQuali.criado_em.toString(),
                    informacoes_complementares: meta.analiseQuali.informacoes_complementares,
                    meta_codigo: meta.meta.codigo,
                    meta_titulo: meta.meta.titulo,
                    meta_id: meta.meta.id.toString(),
                    referencia_data: meta.analiseQuali.referencia_data.toString(),
                });
            }

            if (meta.analiseRisco) {
                riscoRows.push({
                    id: meta.analiseRisco.id.toString(),
                    criador_nome_exibicao: meta.analiseRisco.criador.nome_exibicao,
                    criado_em: meta.analiseRisco.criado_em.toString(),
                    ponto_de_atencao: meta.analiseRisco.ponto_de_atencao,
                    detalhamento: meta.analiseRisco.detalhamento,
                    meta_codigo: meta.meta.codigo,
                    meta_titulo: meta.meta.titulo,
                    meta_id: meta.meta.id.toString(),
                    referencia_data: meta.analiseRisco.referencia_data.toString(),
                });
            }

            if (meta.fechamento) {
                fechamentoRows.push({
                    id: meta.fechamento.id.toString(),
                    criador_nome_exibicao: meta.fechamento.criador.nome_exibicao,
                    criado_em: meta.fechamento.criado_em.toString(),
                    comentario: meta.fechamento.comentario,
                    meta_codigo: meta.meta.codigo,
                    meta_titulo: meta.meta.titulo,
                    meta_id: meta.meta.id.toString(),
                    referencia_data: meta.fechamento.referencia_data.toString(),
                });
            }
        }

        if (qualiRows.length) {
            const json2csvParser = new Parser({
                ...DefaultCsvOptions,
                transforms: defaultTransform,
                fields: undefined,
            });

            const linhas = json2csvParser.parse(qualiRows);
            out.push({
                name: 'analises-qualitativas.csv',
                buffer: Buffer.from(linhas, 'utf8'),
            });
        }

        if (fechamentoRows.length) {
            const json2csvParser = new Parser({
                ...DefaultCsvOptions,
                transforms: defaultTransform,
                fields: undefined,
            });

            const linhas = json2csvParser.parse(fechamentoRows);
            out.push({
                name: 'fechamentos.csv',
                buffer: Buffer.from(linhas, 'utf8'),
            });
        }

        if (riscoRows.length) {
            const json2csvParser = new Parser({
                ...DefaultCsvOptions,
                transforms: defaultTransform,
                fields: undefined,
            });

            const linhas = json2csvParser.parse(riscoRows);
            out.push({
                name: 'analises-de-risco.csv',
                buffer: Buffer.from(linhas, 'utf8'),
            });
        }

        return out;
    }
}
