import { BadRequestException, Injectable } from '@nestjs/common';
import { MetaStatusConsolidadoCf, PessoaAcessoPdm } from '@prisma/client';
import { IdCodTituloDto } from '../../../common/dto/IdCodTitulo.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { FilterMfDashMetasDto, ListMfDashMetasDto } from './dto/metas.dto';

@Injectable()
export class MfDashMetasService {
    constructor(private readonly prisma: PrismaService) {}

    async metas(
        config: PessoaAcessoPdm,
        cicloFisicoId: number,
        params: FilterMfDashMetasDto
    ): Promise<ListMfDashMetasDto> {
        const ehPontoFocal = config.perfil === 'ponto_focal';
        if (params.visao_geral && ehPontoFocal)
            throw new BadRequestException('O seu perfil não pode utilizar a função de visão geral.');

        if (ehPontoFocal) {
            delete params.coordenadores_cp;
            delete params.metas;
            delete params.orgaos;
        }
        if (params.coordenadores_cp?.length == 0) delete params.coordenadores_cp;
        if (params.metas?.length == 0) delete params.metas;
        if (params.orgaos?.length == 0) delete params.orgaos;

        const ret: ListMfDashMetasDto = {
            atrasadas: null,
            pendentes: null,
            atualizadas: null,
            perfil: config.perfil,
        };

        // padrão é puxar as metas do perfil da pessoa
        let metas = [...config.metas_cronograma, ...config.metas_variaveis];

        if (params.coordenadores_cp || params.orgaos || params.metas) {
            metas = await this.aplicaFiltroMetas(params, metas);
        }
        const renderStatus = (r: { meta: IdCodTituloDto } & MetaStatusConsolidadoCf) => {
            return {
                id: r.meta.id,
                codigo: r.meta.codigo,
                titulo: r.meta.titulo,
                analise_qualitativa_enviada: r.analise_qualitativa_enviada,
                fechamento_enviado: r.fechamento_enviado,
                risco_enviado: r.risco_enviado,
                variaveis: {
                    aguardando_complementacao: r.variaveis_aguardando_complementacao,
                    aguardando_cp: r.variaveis_aguardando_cp,
                    conferidas: r.variaveis_conferidas,
                    enviadas: r.variaveis_enviadas,
                    preenchidas: r.variaveis_preenchidas,
                    total: r.variaveis_total,
                },
                cronograma: {
                    preenchido: r.cronograma_preenchido,
                    total: r.cronograma_total,
                },
                orcamento: {
                    preenchido: r.orcamento_preenchido,
                    total: r.orcamento_total,
                },
            };
        };

        if (params.retornar_pendentes) {
            const pendentes = await this.prisma.metaStatusConsolidadoCf.findMany({
                where: {
                    ciclo_fisico_id: cicloFisicoId,
                    meta_id: metas ? { in: metas } : undefined,

                    pendente_ponto_focal: ehPontoFocal ? true : undefined,
                    pendente_cp: ehPontoFocal ? true : undefined,
                },
                include: {
                    meta: {
                        select: { id: true, codigo: true, titulo: true },
                    },
                },
            });
            ret.pendentes = pendentes.map(renderStatus);
        }

        if (params.retornar_atualizadas) {
            const atualizadas = await this.prisma.metaStatusConsolidadoCf.findMany({
                where: {
                    ciclo_fisico_id: cicloFisicoId,
                    meta_id: metas ? { in: metas } : undefined,

                    pendente_ponto_focal: ehPontoFocal ? false : undefined,
                    pendente_cp: ehPontoFocal ? false : undefined,
                },
                include: {
                    meta: {
                        select: { id: true, codigo: true, titulo: true },
                    },
                },
            });
            ret.atualizadas = atualizadas.map(renderStatus);
        }

        return ret;
    }

    private async aplicaFiltroMetas(params: FilterMfDashMetasDto, metas: number[]) {
        const filterMetas = await this.prisma.meta.findMany({
            where: {
                removido_em: null,
                AND: params.visao_geral ? undefined : [{ id: { in: metas } }],
                id: params.metas ? { in: params.metas } : undefined,

                ViewMetaPessoaResponsavelNaCp: params.coordenadores_cp
                    ? {
                          some: {
                              id: { in: params.coordenadores_cp },
                          },
                      }
                    : undefined,

                meta_orgao: params.orgaos
                    ? {
                          some: {
                              id: { in: params.orgaos },
                          },
                      }
                    : undefined,
            },
            select: { id: true },
        });

        metas = filterMetas.map((r) => r.id);
        return metas;
    }
}
