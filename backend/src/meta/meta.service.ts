import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PessoaFromJwt } from 'src/auth/models/PessoaFromJwt';
import { RecordWithId } from 'src/common/dto/record-with-id.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMetaDto, MetaOrgaoParticipante } from './dto/create-meta.dto';
import { FilterMetaDto } from './dto/filter-meta.dto';
import { UpdateMetaDto } from './dto/update-meta.dto';
import { IdNomeExibicao, Meta, MetaOrgao } from './entities/meta.entity';

@Injectable()
export class MetaService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createMetaDto: CreateMetaDto, user: PessoaFromJwt) {
        // TODO: verificar se todos os membros de createMetaDto.coordenadores_cp estão ativos
        // e se tem o privilegios de CP
        // e se os *tema_id são do mesmo PDM
        // se existe pelo menos 1 responsável=true no op

        const created = await this.prisma.$transaction(async (prisma: Prisma.TransactionClient): Promise<RecordWithId> => {
            let op = createMetaDto.orgaos_participantes!;
            let cp = createMetaDto.coordenadores_cp!;
            delete createMetaDto.orgaos_participantes;
            delete createMetaDto.coordenadores_cp;

            let tags = createMetaDto.tags

            const meta = await prisma.meta.create({
                data: {
                    criado_por: user.id,
                    criado_em: new Date(Date.now()),
                    status: '',
                    ativo: true,
                    ...createMetaDto,
                },
                select: { id: true }
            });

            await prisma.metaOrgao.createMany({
                data: await this.buildOrgaosParticipantes(meta.id, op),
            });

            await prisma.metaResponsavel.createMany({
                data: await this.buildMetaResponsaveis(meta.id, op, cp),
            });

            await prisma.metaTag.createMany({
                data: await this.buildTags(meta.id, tags)
            });

            return meta;
        });

        return created;
    }

    async buildTags(metaId: number, tags: number[] | undefined): Promise<Prisma.MetaTagCreateManyInput[]> {
        if (typeof tags === 'undefined') tags = [];
        const arr: Prisma.MetaTagCreateManyInput[] = [];

        for (const tag of tags) {
            arr.push({
                meta_id: metaId,
                tag_id: tag
            })
        }

        return arr;
    }

    async buildMetaResponsaveis(metaId: number, orgaos_participantes: MetaOrgaoParticipante[], coordenadores_cp: number[]): Promise<Prisma.MetaResponsavelCreateManyInput[]> {
        const arr: Prisma.MetaResponsavelCreateManyInput[] = [];

        for (const orgao of orgaos_participantes) {
            for (const participanteId of orgao.participantes) {
                arr.push({
                    meta_id: metaId,
                    pessoa_id: participanteId,
                    orgao_id: orgao.orgao_id,
                    coorderandor_responsavel_cp: false,
                });
            }
        }

        for (const CoordenadoriaParticipanteId of coordenadores_cp) {
            const pessoaFisicaOrgao = await this.prisma.pessoa.findFirst({
                where: {
                    id: CoordenadoriaParticipanteId
                },
                select: {
                    pessoa_fisica: { select: { orgao_id: true } }
                }
            });

            const orgaoId = pessoaFisicaOrgao?.pessoa_fisica?.orgao_id;
            if (orgaoId) {
                arr.push({
                    meta_id: metaId,
                    pessoa_id: CoordenadoriaParticipanteId,
                    orgao_id: orgaoId,
                    coorderandor_responsavel_cp: true,
                });

            }

        }

        return arr;
    }

    async buildOrgaosParticipantes(metaId: number, orgaos_participantes: MetaOrgaoParticipante[]): Promise<Prisma.MetaOrgaoCreateManyInput[]> {
        const arr: Prisma.MetaOrgaoCreateManyInput[] = [];

        let orgaoVisto: Record<number, boolean> = {};
        // ordena por responsáveis primeiro
        orgaos_participantes.sort((a, b) => {
            return a.responsavel && !b.responsavel ? -1 :
                a.responsavel && !b.responsavel ? 0 : 1;
        });

        for (const orgao of orgaos_participantes) {
            if (!orgaoVisto[orgao.orgao_id]) {
                orgaoVisto[orgao.orgao_id] = true;

                arr.push({
                    orgao_id: orgao.orgao_id,
                    responsavel: orgao.responsavel,
                    meta_id: metaId
                });
            }
        }

        return arr;
    }

    async findAll(filters: FilterMetaDto | undefined = undefined) {
        let pdmId = filters?.pdm_id;

        let listActive = await this.prisma.meta.findMany({
            where: {
                removido_em: null,
                pdm_id: pdmId,
            },
            orderBy: [
                { codigo: 'asc' },
            ],
            select: {
                id: true,
                titulo: true,
                contexto: true,
                codigo: true,
                complemento: true,
                macro_tema: { select: { descricao: true, id: true } },
                tema: { select: { descricao: true, id: true } },
                sub_tema: { select: { descricao: true, id: true } },
                pdm_id: true,
                status: true,
                ativo: true,
                meta_orgao: {
                    select: {
                        orgao: { select: { id: true, descricao: true } },
                        responsavel: true
                    }
                },
                meta_responsavel: {
                    select: {
                        orgao: { select: { id: true, descricao: true } },
                        pessoa: { select: { id: true, nome_exibicao: true } },
                        coorderandor_responsavel_cp: true,
                    }
                }
            }
        });
        let ret: Meta[] = [];
        for (const dbMeta of listActive) {
            const coordenadores_cp: IdNomeExibicao[] = [];
            const orgaos: Record<number, MetaOrgao> = {};

            for (const orgao of dbMeta.meta_orgao) {
                orgaos[orgao.orgao.id] = {
                    orgao: orgao.orgao,
                    responsavel: orgao.responsavel,
                    participantes: []
                };
            }

            for (const responsavel of dbMeta.meta_responsavel) {
                if (responsavel.coorderandor_responsavel_cp) {
                    coordenadores_cp.push({
                        id: responsavel.pessoa.id,
                        nome_exibicao: responsavel.pessoa.nome_exibicao,
                    })
                } else {
                    let orgao = orgaos[responsavel.orgao.id];
                    orgao.participantes.push(responsavel.pessoa);
                }
            }

            ret.push({
                id: dbMeta.id,
                titulo: dbMeta.titulo,
                contexto: dbMeta.contexto,
                codigo: dbMeta.codigo,
                complemento: dbMeta.complemento,
                macro_tema: dbMeta.macro_tema,
                tema: dbMeta.tema,
                sub_tema: dbMeta.sub_tema,
                pdm_id: dbMeta.pdm_id,
                status: dbMeta.status,
                ativo: dbMeta.ativo,
                coordenadores_cp: coordenadores_cp,
                orgaos_participantes: Object.values(orgaos),
            })
        }

        return ret;
    }

    async update(id: number, updateMetaDto: UpdateMetaDto, user: PessoaFromJwt) {

        await this.prisma.$transaction(async (prisma: Prisma.TransactionClient): Promise<RecordWithId> => {
            let op = updateMetaDto.orgaos_participantes!;
            let cp = updateMetaDto.coordenadores_cp!;
            delete updateMetaDto.orgaos_participantes;
            delete updateMetaDto.coordenadores_cp;

            const meta = await prisma.meta.update({
                where: { id: id },
                data: {
                    atualizado_por: user.id,
                    atualizado_em: new Date(Date.now()),
                    status: '',
                    ativo: true,
                    ...updateMetaDto,
                },
                select: { id: true }
            });
            await Promise.all([
                prisma.metaOrgao.deleteMany({ where: { meta_id: id } }),
                prisma.metaResponsavel.deleteMany({ where: { meta_id: id } })]
            );

            await Promise.all([
                await prisma.metaOrgao.createMany({
                    data: await this.buildOrgaosParticipantes(meta.id, op),
                }),
                await prisma.metaResponsavel.createMany({
                    data: await this.buildMetaResponsaveis(meta.id, op, cp),
                })
            ]);

            return meta;
        });

        return { id };
    }

    async remove(id: number, user: PessoaFromJwt) {
        const created = await this.prisma.meta.updateMany({
            where: { id: id },
            data: {
                removido_por: user.id,
                removido_em: new Date(Date.now()),
            }
        });

        return created;
    }
}
