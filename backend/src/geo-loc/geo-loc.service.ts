import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GeoCamadaConfig, Prisma } from '@prisma/client';
import { Feature, GeoJSON } from 'geojson';
import { PessoaFromJwt } from '../auth/models/PessoaFromJwt';
import { GeoApiService } from '../geo-api/geo-api.service';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateEnderecoDto,
    CreateGeoEnderecoReferenciaDto,
    FilterCamadasDto,
    GeoLocCamadaFullDto,
    GeoLocCamadaSimplesDto,
    GeoLocDto,
    RetornoCreateEnderecoDto,
    RetornoGeoLoc,
} from './entities/geo-loc.entity';

class GeoTokenJwtBody {
    id: number;
}

@Injectable()
export class GeoLocService {
    private readonly logger = new Logger(GeoLocService.name);
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly geoApi: GeoApiService
    ) {}

    async geoLoc(input: GeoLocDto): Promise<RetornoGeoLoc> {
        const ret: RetornoGeoLoc = { linhas: [] };

        const camadasConfig = await this.prisma.geoCamadaConfig.findMany();
        const buscaEndereco = await this.geoApi.buscaEndereco({
            busca_endereco: input.busca_endereco,
            camadas: camadasConfig.map((r) => {
                return { alias: r.id.toString(), layer_name: r.tipo_camada };
            }),
        });

        for (const apiEndereco of buscaEndereco) {
            const geoCamadas = await this.upsertCamadas(apiEndereco.camadas_geosampa, camadasConfig);

            const endereco = apiEndereco.endereco;
            if (endereco.type == 'FeatureCollection' && input.tipo == 'Endereco') {
                for (const feature of endereco.features) {
                    ret.linhas.push({
                        endereco: feature,
                        camadas: geoCamadas,
                    });
                }
            } else {
                throw new InternalServerErrorException('Retorno inesperado para tipo de busca executada.');
            }
        }

        return ret;
    }

    private async upsertCamadas(
        camadas: Record<string, GeoJSON> | undefined,
        camadasConfig: GeoCamadaConfig[]
    ): Promise<GeoLocCamadaSimplesDto[]> {
        const ret: GeoLocCamadaSimplesDto[] = [];
        if (!camadas) return ret;

        for (const dbConfig of camadasConfig) {
            const featureCollection = camadas[dbConfig.id];
            if (!featureCollection) continue;

            if (featureCollection.type != 'FeatureCollection') {
                this.logger.warn(`expected featureCollection.type=FeatureCollection`);
                continue;
            }

            if (!('features' in featureCollection) || !Array.isArray(featureCollection.features)) {
                this.logger.warn(`expected featureCollection.features to exists and be array`);
                continue;
            }

            for (const feature of featureCollection.features) {
                if (!feature || !feature.properties) continue;
                const propCodigo = feature.properties[dbConfig.chave_camada];
                const propTitulo = feature.properties[dbConfig.titulo_camada];

                if (!propCodigo || typeof propCodigo != 'string') {
                    this.logger.warn(`expected feature[${dbConfig.chave_camada}] to exists and be string`);
                    continue;
                }
                if (!propTitulo || typeof propTitulo != 'string') {
                    this.logger.warn(`expected feature[${dbConfig.titulo_camada}] to exists and be string`);
                    continue;
                }

                let geoCamada = await this.prisma.geoCamada.findFirst({
                    where: {
                        tipo_camada: dbConfig.tipo_camada,
                        codigo: propCodigo,
                    },
                });

                if (!geoCamada) {
                    geoCamada = await this.criaCamada(dbConfig, feature, propCodigo, propTitulo);
                }

                ret.push({
                    id: geoCamada.id,
                    codigo: geoCamada.codigo,
                    titulo: geoCamada.titulo,
                    descricao: dbConfig.descricao,
                    cor: dbConfig.cor,
                    nivel_regionalizacao: dbConfig.nivel_regionalizacao,
                });
            }
        }

        return ret;
    }

    private async criaCamada(
        dbConfig: {
            id: number;
            tipo_camada: string;
            chave_camada: string;
            nivel_regionalizacao: number | null;
            simplificar_em: number | null;
        },
        feature: Feature,
        propCodigo: string,
        propTitulo: string
    ) {
        // TODO: quando tiver funcionando o decode, da pra rodar a simplificação
        const geoCamada = await this.prisma.geoCamada.create({
            data: {
                tipo_camada: dbConfig.tipo_camada,
                geom_geojson: feature as any,
                geom_geojson_original: feature as any,
                nivel_regionalizacao: dbConfig.nivel_regionalizacao,
                codigo: propCodigo,
                titulo: propTitulo,
                geo_camada_config: dbConfig.id,
            },
        });

        if (dbConfig.nivel_regionalizacao != null && geoCamada) {
            const regioes = await this.prisma.regiao.findMany({
                where: {
                    nivel: dbConfig.nivel_regionalizacao,
                    codigo: propCodigo,
                    removido_em: null,
                },
                select: { id: true },
            });

            await this.prisma.geoCamadaRegiao.createMany({
                data: regioes.map((r) => {
                    return {
                        geo_camada_id: geoCamada!.id,
                        regiao_id: r.id,
                    };
                }),
            });
        }
        return geoCamada;
    }

    private decodeToken(jwt: string): GeoTokenJwtBody {
        let tmp: GeoTokenJwtBody | null = null;
        try {
            if (jwt) tmp = this.jwtService.verify(jwt) as GeoTokenJwtBody;
        } catch {}
        if (!tmp) throw new BadRequestException('geo token is invalid');
        return tmp;
    }

    private encodeToken(opt: GeoTokenJwtBody): string {
        return this.jwtService.sign(opt);
    }

    async buscaCamadas(dto: FilterCamadasDto): Promise<GeoLocCamadaFullDto[]> {
        const rows = await this.prisma.geoCamada.findMany({
            where: {
                id: { in: dto.camada_ids },
            },
            select: {
                id: true,
                codigo: true,
                titulo: true,
                geom_geojson: true,
                config: true,
            },
        });

        return rows
            .filter((r) => r.geom_geojson?.valueOf())
            .map((r) => {
                return {
                    ...r,
                    descricao: r.config.descricao,
                    cor: r.config.cor,
                    nivel_regionalizacao: r.config.nivel_regionalizacao,
                    geom_geojson: r.geom_geojson?.valueOf() as GeoJSON,
                };
            });
    }

    async createEndereco(dto: CreateEnderecoDto, user: PessoaFromJwt): Promise<RetornoCreateEnderecoDto> {
        let endereco_exibicao = '';
        let lat = 0;
        let lon = 0;
        if (dto.tipo == 'Endereco' && dto.endereco.type != 'Feature')
            throw new BadRequestException('Para o tipo Endereço o GeoJson precisa ser do tipo Feature');

        if (dto.tipo == 'Endereco' && dto.endereco.type == 'Feature') {
            if (dto.endereco.geometry.type == 'Point') {
                [lon, lat] = [...dto.endereco.geometry.coordinates];
            } else {
                throw new BadRequestException('Para o tipo Endereço o GeoJson ter uma coordenada do tipo Ponto');
            }

            const propEndereco = dto.endereco.properties ? dto.endereco.properties['string_endereco'] : null;
            if (typeof propEndereco != 'string')
                throw new BadRequestException('Para o tipo Endereço o GeoJson ter a propriedade string_endereco');
            endereco_exibicao = propEndereco;
        }

        const now = new Date(Date.now());
        return await this.prisma.$transaction(
            async (prismaTx: Prisma.TransactionClient): Promise<RetornoCreateEnderecoDto> => {
                const endereco = await prismaTx.geoLocalizacao.create({
                    data: {
                        endereco_exibicao,
                        lat,
                        lon,
                        tipo: dto.tipo,
                        geom_geojson: dto.endereco as any,
                        metadata: { criado_por: user.id },
                        criado_em: now,
                        GeoEnderecoCamada: dto.camadas
                            ? {
                                  createMany: {
                                      data: dto.camadas.map((camada_id) => {
                                          return {
                                              geo_camada_id: camada_id,
                                          };
                                      }),
                                      skipDuplicates: true,
                                  },
                              }
                            : undefined,
                    },
                    select: {
                        id: true,
                        endereco_exibicao: true,
                        geom_geojson: true,
                        tipo: true,
                        GeoEnderecoCamada: {
                            select: {
                                geo_camada: {
                                    select: {
                                        id: true,
                                        titulo: true,
                                        codigo: true,
                                        config: true,
                                    },
                                },
                            },
                        },
                    },
                });

                return {
                    endereco_exibicao: endereco.endereco_exibicao,
                    token: this.encodeToken({ id: endereco.id }),
                    tipo: endereco.tipo,
                    endereco: endereco.geom_geojson as any as GeoJSON,
                    camadas: endereco.GeoEnderecoCamada.map((c) => {
                        return {
                            codigo: c.geo_camada.codigo,
                            titulo: c.geo_camada.titulo,
                            id: c.geo_camada.id,
                            descricao: c.geo_camada.config.descricao,
                            nivel_regionalizacao: c.geo_camada.config.nivel_regionalizacao,
                            cor: c.geo_camada.config.cor,
                        };
                    }),
                };
            }
        );
    }

    private async associar(
        dto: CreateGeoEnderecoReferenciaDto,
        user: PessoaFromJwt,
        prismaTx: Prisma.TransactionClient
    ): Promise<number> {
        const enderecoJwt = this.decodeToken(dto.token);

        const endereco = await prismaTx.geoLocalizacao.findUniqueOrThrow({
            where: { id: enderecoJwt.id },
        });
        if (endereco.tipo != dto.tipo)
            throw new BadRequestException(
                `Tipo da geolocalização ${endereco.tipo} precisa ser o mesmo tipo da associação ${dto.tipo}`
            );

        if (!dto.projeto_id || !dto.iniciativa_id || !dto.atividade_id || !dto.meta_id || !dto.etapa_id) {
            throw new InternalServerErrorException('Necessário informar com qual associação!');
        }

        const record = await prismaTx.geoLocalizacaoReferencia.create({
            data: {
                tipo: endereco.tipo,
                criado_em: new Date(Date.now()),
                criador_por: user.id,
                geo_localizacao_id: endereco.id,
                projeto_id: dto.projeto_id,
                iniciativa_id: dto.iniciativa_id,
                atividade_id: dto.atividade_id,
                meta_id: dto.meta_id,
                etapa_id: dto.etapa_id,
            },
            select: { id: true },
        });
        return record.id;
    }
}
