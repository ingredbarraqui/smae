import { BadRequestException, ForbiddenException, HttpException, Injectable, Logger } from '@nestjs/common';
import { Pessoa, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PessoaFromJwt } from '../auth/models/PessoaFromJwt';
import { RecordWithId } from '../common/dto/record-with-id.dto';
import { NovaSenhaDto } from '../minha-conta/models/nova-senha.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { DetalhePessoaDto } from './dto/detalhe-pessoa.dto';
import { FilterPessoaDto } from './dto/filter-pessoa.dto';
import { PerfilAcessoPrivilegios } from './dto/perifl-acesso-privilegios.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { ListaPrivilegiosModulos } from './entities/ListaPrivilegiosModulos';
import { uuidv7 } from 'uuidv7';
import { MathRandom } from '../common/math-random';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class PessoaService {
    private readonly logger = new Logger(PessoaService.name);

    #maxQtdeSenhaInvalidaParaBlock: number;
    #urlLoginSMAE: string;
    #cpfObrigatorioSemRF: boolean;
    #matchEmailRFObrigatorio: string;
    constructor(private readonly prisma: PrismaService) {
        this.#maxQtdeSenhaInvalidaParaBlock = Number(process.env.MAX_QTDE_SENHA_INVALIDA_PARA_BLOCK) || 3;
        this.#urlLoginSMAE = process.env.URL_LOGIN_SMAE || '#/login-smae';
        this.#cpfObrigatorioSemRF = Number(process.env.CPF_OBRIGATORIO_SEM_RF) == 1;
        this.#matchEmailRFObrigatorio = process.env.MATCH_EMAIL_RF_OBRIGATORIO || '';
    }

    pessoaAsHash(pessoa: Pessoa) {
        return {
            nome_exibicao: pessoa.nome_exibicao,
            id: pessoa.id,
        };
    }

    async senhaCorreta(senhaInformada: string, pessoa: Partial<Pessoa>) {
        if (!pessoa.senha) throw new Error('faltando senha');

        return await bcrypt.compare(senhaInformada, pessoa.senha);
    }

    async incrementarSenhaInvalida(pessoa: Pessoa) {
        const updatedPessoa = await this.prisma.pessoa.update({
            where: { id: pessoa.id },
            data: {
                qtde_senha_invalida: { increment: 1 },
            },
            select: { qtde_senha_invalida: true },
        });

        if (updatedPessoa.qtde_senha_invalida >= this.#maxQtdeSenhaInvalidaParaBlock) {
            await this.criaNovaSenha(pessoa, false);
        }
    }

    async criaNovaSenha(pessoa: Pessoa, solicitadoPeloUsuario: boolean) {
        const newPass = this.#generateRndPass(10);
        this.logger.log(`new password: ${newPass}`, pessoa);

        const data = {
            senha_bloqueada: true,
            senha_bloqueada_em: new Date(Date.now()),
            senha: await bcrypt.hash(newPass, BCRYPT_ROUNDS),
        };

        await this.prisma.$transaction(async (prisma: Prisma.TransactionClient) => {
            await prisma.pessoa.updateMany({
                where: { id: pessoa.id },
                data: data,
            });

            await this.enviaEmailNovaSenha(pessoa, newPass, solicitadoPeloUsuario, prisma);
        });
    }

    async enviaEmailNovaSenha(
        pessoa: Pessoa,
        senha: string,
        solicitadoPeloUsuario: boolean,
        prisma: Prisma.TransactionClient
    ) {
        await prisma.emaildbQueue.create({
            data: {
                id: uuidv7(),
                config_id: 1,
                subject: solicitadoPeloUsuario ? 'Nova senha solicitada' : 'Nova senha para liberar acesso',
                template: 'nova-senha.html',
                to: pessoa.email,
                variables: {
                    tentativas: this.#maxQtdeSenhaInvalidaParaBlock,
                    link: this.#urlLoginSMAE,
                    nova_senha: senha,
                    solicitadoPeloUsuario: solicitadoPeloUsuario,
                },
            },
        });
    }

    async enviaPrimeiraSenha(pessoa: Pessoa, senha: string, prisma: Prisma.TransactionClient) {
        const tosText = (await prisma.textoConfig.findFirstOrThrow({ where: { id: 1 } })).bemvindo_email;

        await prisma.emaildbQueue.create({
            data: {
                id: uuidv7(),
                config_id: 1,
                subject: 'Bem vindo ao SMAE - Senha para primeiro acesso',
                template: 'primeira-senha.html',
                to: pessoa.email,
                variables: {
                    nome_exibicao: pessoa.nome_exibicao,
                    tos: tosText,
                    link: this.#urlLoginSMAE + '?referencia=primeiro-acesso',
                    nova_senha: senha,
                },
            },
        });
    }

    async escreverNovaSenhaById(pessoaId: number, senha: string, keepSession?: boolean) {
        const data = {
            senha_bloqueada: false,
            senha_bloqueada_em: null,
            senha: await bcrypt.hash(senha, BCRYPT_ROUNDS),
            qtde_senha_invalida: 0,
        };

        this.logger.log(`escreverNovaSenhaById: ${pessoaId}`);
        const updated = await this.prisma.$transaction(async (prismaTx: Prisma.TransactionClient): Promise<any> => {
            const updatePassword = await prismaTx.pessoa.updateMany({
                where: { id: pessoaId },
                data: data,
            });
            if (updatePassword.count == 1) {
                if (!keepSession) {
                    this.logger.log(`escreverNovaSenhaById: sucesso, removendo sessões anteriores`);
                    await this.invalidarTodasSessoesAtivas(pessoaId, prismaTx);
                }
                return true;
            }

            this.logger.log(`escreverNovaSenhaById: senha já foi atualizada`);
            return false;
        });

        return updated;
    }

    private async verificarPrivilegiosCriacao(createPessoaDto: CreatePessoaDto, user: PessoaFromJwt) {
        if (createPessoaDto.orgao_id === undefined) {
            if (user.hasSomeRoles(['CadastroPessoa.administrador']) === false) {
                throw new ForbiddenException(`Para criar pessoas sem órgão é necessário ser um administrador.`);
            }
        }

        if (
            createPessoaDto.orgao_id &&
            user.orgao_id &&
            user.hasSomeRoles(['CadastroPessoa.administrador']) === false &&
            Number(createPessoaDto.orgao_id) != Number(user.orgao_id)
        ) {
            throw new ForbiddenException(`Você só pode criar pessoas para o seu próprio órgão.`);
        }

        if (user.hasSomeRoles(['SMAE.superadmin']) == false) {
            await this.verificarPerfilNaoContemAdmin(createPessoaDto.perfil_acesso_ids);
        }
    }

    private async verificarPrivilegiosEdicao(id: number, updatePessoaDto: UpdatePessoaDto, user: PessoaFromJwt) {
        if (user.hasSomeRoles(['SMAE.superadmin']) == false && updatePessoaDto.perfil_acesso_ids) {
            const oldPessoaPerfis = (
                await this.prisma.pessoaPerfil.findMany({
                    where: { pessoa_id: id },
                    select: { perfil_acesso_id: true },
                })
            )
                .map((e) => e.perfil_acesso_id)
                .sort((a, b) => +a - +b)
                .join(',');
            const newPessoaPerfis = updatePessoaDto.perfil_acesso_ids.sort((a, b) => +a - +b).join(',');

            // verificar se realmente esta acontecendo uma mudança, pois o frontend sempre envia os dados
            if (newPessoaPerfis !== oldPessoaPerfis) {
                // verifica tbm se não está tentando remover o admin, mas nesse caso, tbm é necessario
                await this.verificarPerfilNaoContemAdmin(oldPessoaPerfis.split(',').map((n) => +n));

                // verifica se não está tentando adicionar admin
                await this.verificarPerfilNaoContemAdmin(updatePessoaDto.perfil_acesso_ids);
            }
        }

        const pessoaCurrentOrgao = await this.prisma.pessoaFisica.findFirst({
            where: {
                pessoa: {
                    some: {
                        id: id,
                    },
                },
            },
            select: { orgao_id: true },
        });

        this.logger.debug(`pessoaCurrentOrgao=${JSON.stringify(pessoaCurrentOrgao)}`);
        this.logger.debug(`updatePessoaDto=${JSON.stringify(updatePessoaDto)}`);
        this.logger.debug(`user=${JSON.stringify(user)}`);

        if (
            pessoaCurrentOrgao &&
            updatePessoaDto.orgao_id &&
            user.hasSomeRoles(['CadastroPessoa.administrador']) === false &&
            Number(pessoaCurrentOrgao.orgao_id) != Number(user.orgao_id)
        ) {
            throw new ForbiddenException(`Você só pode editar pessoas do seu próprio órgão.`);
        }

        if (
            pessoaCurrentOrgao &&
            updatePessoaDto.desativado === true &&
            user.hasSomeRoles(['CadastroPessoa.inativar']) &&
            user.hasSomeRoles(['CadastroPessoa.administrador']) === false &&
            Number(pessoaCurrentOrgao.orgao_id) != Number(user.orgao_id)
        ) {
            throw new ForbiddenException(`Você só pode inativar pessoas do seu próprio órgão.`);
        } else if (updatePessoaDto.desativado === true && user.hasSomeRoles(['CadastroPessoa.inativar']) === false) {
            throw new ForbiddenException(`Você não pode inativar pessoas.`);
        } else if (updatePessoaDto.desativado === true && !updatePessoaDto.desativado_motivo) {
            throw new ForbiddenException(`Você precisa informar o motivo para desativar uma pessoa.`);
        }

        if (
            pessoaCurrentOrgao &&
            updatePessoaDto.desativado === false &&
            user.hasSomeRoles(['CadastroPessoa.ativar']) &&
            user.hasSomeRoles(['CadastroPessoa.administrador']) === false &&
            Number(pessoaCurrentOrgao.orgao_id) != Number(user.orgao_id)
        ) {
            throw new ForbiddenException(`Você só pode ativar pessoas do seu próprio órgão.`);
        } else if (updatePessoaDto.desativado === false && user.hasSomeRoles(['CadastroPessoa.ativar']) === false) {
            throw new ForbiddenException(`Você não pode ativar pessoas.`);
        }

        if (pessoaCurrentOrgao == undefined && updatePessoaDto.orgao_id) {
            throw new ForbiddenException(
                `Atualização do órgão da pessoa não é possível, peça atualização no banco de dados.`
            );
        }
    }

    async verificarPerfilNaoContemAdmin(perfil_acesso_ids: number[]) {
        const privilegios = await this.prisma.perfilAcesso.findMany({
            where: {
                id: { in: perfil_acesso_ids },
            },
            select: {
                perfil_privilegio: {
                    select: {
                        privilegio: {
                            select: { codigo: true },
                        },
                    },
                },
            },
        });

        const codigos = privilegios.reduce((prev, r) => {
            return [...prev, ...r.perfil_privilegio.map((s) => s.privilegio.codigo)];
        }, []);

        if (codigos.includes('SMAE.superadmin'))
            throw new HttpException(
                'O seu usuário não pode adicionar ou remover permissões de outros usuários que são administradores do sistema, ou adicionar a permissão de administrador para um usuário já existente.',
                400
            );

        console.log(codigos);
    }

    private verificarCPFObrigatorio(dto: CreatePessoaDto | UpdatePessoaDto) {
        if (!this.#cpfObrigatorioSemRF) return;

        if (!dto.registro_funcionario && !dto.cpf) {
            throw new HttpException('cpf| CPF obrigatório para conta sem registro_funcionario', 400);
        }
    }

    private verificarRFObrigatorio(dto: CreatePessoaDto | UpdatePessoaDto) {
        if (
            this.#matchEmailRFObrigatorio &&
            !dto.registro_funcionario &&
            dto.email &&
            dto.email.endsWith('@' + this.#matchEmailRFObrigatorio)
        ) {
            throw new HttpException(
                `registro_funcionario| Registro de funcionário obrigatório para e-mails terminando @${this.#matchEmailRFObrigatorio}`,
                400
            );
        }

        if (!this.#cpfObrigatorioSemRF) return;

        if (!dto.cpf && !dto.registro_funcionario) {
            throw new HttpException(
                'registro_funcionario| Registro de funcionário obrigatório caso CPF não seja informado',
                400
            );
        }
    }

    async getDetail(pessoaId: number, user: PessoaFromJwt): Promise<DetalhePessoaDto> {
        const pessoa = await this.prisma.pessoa.findFirst({
            where: {
                id: pessoaId,
            },
            include: {
                pessoa_fisica: true,
                PessoaPerfil: {
                    select: {
                        perfil_acesso_id: true,
                    },
                },

                GruposDePaineisQueParticipo: {
                    select: {
                        grupo_painel: {
                            select: {
                                id: true,
                                nome: true,
                            },
                        },
                    },
                },
            },
        });
        if (!pessoa) throw new HttpException('Pessoa não encontrada', 404);

        const responsavel_pelos_projetos = await this.prisma.projeto.findMany({
            where: {
                responsavel_id: pessoa.id,
                removido_em: null,
            },
            orderBy: { nome: 'asc' },
            select: { id: true, codigo: true, nome: true },
        });

        const listFixed = {
            id: pessoa.id,
            nome_completo: pessoa.nome_completo,
            nome_exibicao: pessoa.nome_exibicao,
            atualizado_em: pessoa.atualizado_em,
            desativado_em: pessoa.desativado_em || undefined,
            desativado: pessoa.desativado,
            desativado_motivo: pessoa.desativado_motivo,
            email: pessoa.email,
            lotacao: pessoa.pessoa_fisica?.lotacao ? pessoa.pessoa_fisica.lotacao : undefined,
            orgao_id: pessoa.pessoa_fisica?.orgao_id || undefined,
            cargo: pessoa.pessoa_fisica?.cargo || null,
            registro_funcionario: pessoa.pessoa_fisica?.registro_funcionario || null,
            cpf: pessoa.pessoa_fisica?.cpf || null,
            perfil_acesso_ids: pessoa.PessoaPerfil.map((e) => e.perfil_acesso_id),
            grupos: pessoa.GruposDePaineisQueParticipo.map((e) => e.grupo_painel),
            responsavel_pelos_projetos,
        };

        return listFixed;
    }

    async update(pessoaId: number, updatePessoaDto: UpdatePessoaDto, user: PessoaFromJwt) {
        await this.verificarPrivilegiosEdicao(pessoaId, updatePessoaDto, user);
        this.verificarCPFObrigatorio(updatePessoaDto);
        this.verificarRFObrigatorio(updatePessoaDto);

        const self = await this.prisma.pessoa.findFirstOrThrow({
            where: {
                id: pessoaId,
            },
            include: {
                pessoa_fisica: true,
            },
        });

        const now = new Date(Date.now());

        await this.prisma.$transaction(
            async (prismaTx: Prisma.TransactionClient) => {
                const emailExists = updatePessoaDto.email
                    ? await prismaTx.pessoa.count({
                          where: {
                              email: updatePessoaDto.email,
                              NOT: {
                                  id: pessoaId,
                              },
                          },
                      })
                    : 0;
                if (emailExists > 0) {
                    throw new HttpException('email| E-mail está em uso em outra conta', 400);
                }

                if (updatePessoaDto.registro_funcionario) {
                    const registroFuncionarioExists = await prismaTx.pessoa.count({
                        where: {
                            NOT: { id: pessoaId },
                            pessoa_fisica: { registro_funcionario: updatePessoaDto.registro_funcionario },
                        },
                    });
                    if (registroFuncionarioExists > 0) {
                        throw new HttpException(
                            'registro_funcionario| Registro de funcionário já atrelado a outra conta',
                            400
                        );
                    }
                }

                if (updatePessoaDto.cpf) {
                    const registroFuncionarioExists = await prismaTx.pessoa.count({
                        where: {
                            NOT: { id: pessoaId },
                            pessoa_fisica: { cpf: updatePessoaDto.cpf },
                        },
                    });
                    if (registroFuncionarioExists > 0) {
                        throw new HttpException('cpf| CPF já atrelado a outra conta', 400);
                    }
                }

                const grupos_to_assign = [];
                if (updatePessoaDto.grupos) {
                    const grupos = updatePessoaDto.grupos;
                    delete updatePessoaDto.grupos;

                    for (const grupo of grupos) {
                        grupos_to_assign.push({ grupo_painel_id: grupo });
                    }

                    // apaga todos os grupos
                    await prismaTx.pessoaGrupoPainel.deleteMany({ where: { pessoa_id: pessoaId } });
                }

                if (
                    updatePessoaDto.orgao_id &&
                    self.pessoa_fisica &&
                    self.pessoa_fisica.orgao_id &&
                    self.pessoa_fisica.orgao_id != updatePessoaDto.orgao_id
                ) {
                    this.logger.log(
                        `Trocou de órgão: removendo relacionamentos de grupoPortfolioPessoa no órgão antigo.`
                    );

                    await prismaTx.grupoPortfolioPessoa.updateMany({
                        where: {
                            pessoa_id: self.id,
                            orgao_id: self.pessoa_fisica.orgao_id,
                            removido_em: null,
                        },
                        data: {
                            removido_em: now,
                        },
                    });

                    this.logger.log(`Trocou de órgão: removendo relacionamentos de projetoEquipe no órgão antigo.`);
                    await prismaTx.projetoEquipe.updateMany({
                        where: {
                            pessoa_id: self.id,
                            orgao_id: self.pessoa_fisica.orgao_id,
                            removido_em: null,
                        },
                        data: {
                            removido_em: now,
                        },
                    });
                }

                await prismaTx.pessoa.update({
                    where: {
                        id: pessoaId,
                    },
                    data: {
                        nome_completo: updatePessoaDto.nome_completo,
                        nome_exibicao: updatePessoaDto.nome_exibicao,
                        email: updatePessoaDto.email,

                        pessoa_fisica: {
                            update: {
                                cargo: updatePessoaDto.cargo,
                                lotacao: updatePessoaDto.lotacao,
                                orgao_id: updatePessoaDto.orgao_id,
                                cpf: updatePessoaDto.cpf,
                                registro_funcionario: updatePessoaDto.registro_funcionario,
                            },
                        },

                        GruposDePaineisQueParticipo: {
                            // aqui vai inserir de novo
                            createMany: {
                                data: grupos_to_assign,
                            },
                        },
                    },
                });

                if (updatePessoaDto.desativado === true) {
                    await prismaTx.pessoa.update({
                        where: {
                            id: pessoaId,
                        },
                        data: {
                            desativado: true,
                            desativado_motivo: updatePessoaDto.desativado_motivo,
                            desativado_por: Number(user.id),
                            desativado_em: now,
                        },
                    });
                } else if (updatePessoaDto.desativado === false) {
                    await prismaTx.pessoa.update({
                        where: {
                            id: pessoaId,
                        },
                        data: {
                            desativado: false,
                            desativado_por: null,
                            desativado_em: null,
                            desativado_motivo: null,
                            atualizado_por: user.id,
                            atualizado_em: now,
                        },
                    });
                } else {
                    await prismaTx.pessoa.update({
                        where: {
                            id: pessoaId,
                        },
                        data: {
                            atualizado_por: user.id,
                            atualizado_em: now,
                        },
                    });
                }

                if (Array.isArray(updatePessoaDto.perfil_acesso_ids)) {
                    const promises = [];

                    await prismaTx.pessoaPerfil.deleteMany({
                        where: { pessoa_id: pessoaId },
                    });

                    for (const perm of updatePessoaDto.perfil_acesso_ids) {
                        promises.push(
                            prismaTx.pessoaPerfil.create({ data: { perfil_acesso_id: +perm, pessoa_id: pessoaId } })
                        );
                    }
                    await Promise.all(promises);

                    this.logger.log(`recalculando pessoa_acesso_pdm...`);
                    await prismaTx.$queryRaw`select pessoa_acesso_pdm(${pessoaId}::int)`;
                }
            },
            {
                // verificar o email dentro do contexto Serializable
                isolationLevel: 'Serializable',
                maxWait: 5000,
                timeout: 5000,
            }
        );

        return { id: pessoaId };
    }

    async criarPessoa(createPessoaDto: CreatePessoaDto, user?: PessoaFromJwt) {
        if (user) {
            await this.verificarPrivilegiosCriacao(createPessoaDto, user);
        }
        this.verificarCPFObrigatorio(createPessoaDto);
        this.verificarRFObrigatorio(createPessoaDto);

        this.logger.log(`criarPessoa: ${JSON.stringify(createPessoaDto)}`);
        const newPass = this.#generateRndPass(10);
        this.logger.log(`senha gerada: ${newPass}`);

        createPessoaDto.email = createPessoaDto.email.toLocaleLowerCase();

        const pessoaData = {
            nome_completo: createPessoaDto.nome_completo,
            nome_exibicao: createPessoaDto.nome_exibicao,
            email: createPessoaDto.email,
            senha: await bcrypt.hash(newPass, BCRYPT_ROUNDS),
            senha_bloqueada: true,
            senha_bloqueada_em: new Date(Date.now()),
        } as Prisma.PessoaCreateInput;

        const pessoa = await this.prisma.$transaction(
            async (prismaTx: Prisma.TransactionClient): Promise<RecordWithId> => {
                const emailExists = await prismaTx.pessoa.count({ where: { email: createPessoaDto.email } });
                if (emailExists > 0) {
                    throw new HttpException('email| E-mail já tem conta', 400);
                }

                if (createPessoaDto.registro_funcionario) {
                    const registroFuncionarioExists = await prismaTx.pessoa.count({
                        where: { pessoa_fisica: { registro_funcionario: createPessoaDto.registro_funcionario } },
                    });
                    if (registroFuncionarioExists > 0) {
                        throw new HttpException(
                            'registro_funcionario| Registro de funcionário já atrelado a outra conta',
                            400
                        );
                    }
                }

                if (createPessoaDto.cpf) {
                    const registroFuncionarioExists = await prismaTx.pessoa.count({
                        where: { pessoa_fisica: { cpf: createPessoaDto.cpf } },
                    });
                    if (registroFuncionarioExists > 0) {
                        throw new HttpException('cpf| CPF já atrelado a outra conta', 400);
                    }
                }

                let pessoaFisica;
                if (createPessoaDto.orgao_id) {
                    pessoaFisica = await prismaTx.pessoaFisica.create({
                        data: {
                            orgao_id: createPessoaDto.orgao_id,
                            lotacao: createPessoaDto.lotacao,
                            cpf: createPessoaDto.cpf,
                            registro_funcionario: createPessoaDto.registro_funcionario,
                        },
                    });
                }

                const grupos_to_assign = [];
                if (createPessoaDto.grupos) {
                    const grupos = createPessoaDto.grupos;
                    delete createPessoaDto.grupos;

                    for (const grupo of grupos) {
                        grupos_to_assign.push({ grupo_painel_id: grupo });
                    }
                }

                const created = await prismaTx.pessoa.create({
                    data: {
                        ...pessoaData,
                        pessoa_fisica_id: pessoaFisica ? pessoaFisica.id : null,

                        GruposDePaineisQueParticipo: {
                            createMany: {
                                data: grupos_to_assign,
                            },
                        },
                    } as Prisma.PessoaCreateInput,
                });

                const promises = [];
                for (const perm of createPessoaDto.perfil_acesso_ids) {
                    promises.push(
                        prismaTx.pessoaPerfil.create({ data: { perfil_acesso_id: +perm, pessoa_id: created.id } })
                    );
                }
                promises.push(this.enviaPrimeiraSenha(created, newPass, prismaTx));
                await Promise.all(promises);

                this.logger.log(`calculando pessoa_acesso_pdm...`);
                await prismaTx.$queryRaw`select pessoa_acesso_pdm(${created.id}::int)`;

                return created;
            },
            {
                // verificar o email dentro do contexto Serializable
                isolationLevel: 'Serializable',
                maxWait: 5000,
                timeout: 5000,
            }
        );

        return { id: pessoa.id };
    }

    async findAll(filters: FilterPessoaDto | undefined = undefined) {
        this.logger.log(`buscando pessoas...`);
        const selectColumns = {
            id: true,
            nome_completo: true,
            nome_exibicao: true,
            atualizado_em: true,
            desativado_em: true,
            desativado_motivo: true,
            desativado: true,
            email: true,
            pessoa_fisica: {
                select: {
                    lotacao: true,
                    orgao_id: true,
                },
            },
            PessoaPerfil: {
                select: {
                    perfil_acesso_id: true,
                },
            },
        };

        if (filters?.coorderandor_responsavel_cp !== undefined) {
            filters.coordenador_responsavel_cp = filters.coorderandor_responsavel_cp;
        }

        const filtrosExtra = this.filtrosPrivilegios(filters);
        if (filters?.orgao_id) {
            this.logger.log(`filtrando órgão é ${filters?.orgao_id}`);
        }

        const listActive = await this.prisma.pessoa.findMany({
            orderBy: {
                nome_exibicao: 'asc',
            },
            where: {
                NOT: { pessoa_fisica_id: null },
                AND: filtrosExtra,
                pessoa_fisica: {
                    orgao_id: filters?.orgao_id,
                },
            },
            select: selectColumns,
        });

        const listFixed = listActive.map((p) => {
            return {
                id: p.id,
                nome_completo: p.nome_completo,
                nome_exibicao: p.nome_exibicao,
                atualizado_em: p.atualizado_em,
                desativado_motivo: p.desativado_motivo,
                desativado_em: p.desativado_em || undefined,
                desativado: p.desativado,
                email: p.email,
                lotacao: p.pessoa_fisica?.lotacao ? p.pessoa_fisica.lotacao : undefined,
                orgao_id: p.pessoa_fisica?.orgao_id || undefined,
                perfil_acesso_ids: p.PessoaPerfil.map((e) => e.perfil_acesso_id),
            };
        });

        this.logger.log(`encontrado ${listFixed.length} resultados`);

        return listFixed;
    }

    private filtrosPrivilegios(filters: FilterPessoaDto | undefined): Prisma.PessoaWhereInput[] {
        const extraFilter: Prisma.PessoaWhereInput[] = [];

        if (filters?.coordenador_responsavel_cp) {
            this.logger.log('filtrando apenas coordenador_responsavel_cp');
            extraFilter.push({
                PessoaPerfil: {
                    some: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'PDM.coordenador_responsavel_cp',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        } else if (filters?.coordenador_responsavel_cp === false) {
            this.logger.log('filtrando quem não é coordenador_responsavel_cp');
            extraFilter.push({
                PessoaPerfil: {
                    none: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'PDM.coordenador_responsavel_cp',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        if (filters?.gestor_de_projeto) {
            this.logger.log('filtrando apenas gestor_de_projeto');
            extraFilter.push({
                PessoaPerfil: {
                    some: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.gestor_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        } else if (filters?.gestor_de_projeto === false) {
            this.logger.log('filtrando quem não é gestor_de_projeto');
            extraFilter.push({
                PessoaPerfil: {
                    none: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.gestor_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        if (filters?.colaborador_de_projeto) {
            this.logger.log('filtrando apenas gestor_de_projeto');
            extraFilter.push({
                PessoaPerfil: {
                    some: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.colaborador_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        } else if (filters?.colaborador_de_projeto === false) {
            this.logger.log('filtrando quem não é colaborador_de_projeto');
            extraFilter.push({
                PessoaPerfil: {
                    none: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.colaborador_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        if (filters?.espectador_de_painel_externo) {
            this.logger.log('filtrando apenas espectador_de_painel_externo');
            extraFilter.push({
                PessoaPerfil: {
                    some: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.espectador_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        } else if (filters?.espectador_de_painel_externo === false) {
            this.logger.log('filtrando quem não é espectador_de_painel_externo');
            extraFilter.push({
                PessoaPerfil: {
                    none: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.espectador_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        if (filters?.espectador_de_projeto) {
            this.logger.log('filtrando apenas espectador_de_projeto');
            extraFilter.push({
                PessoaPerfil: {
                    some: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.espectador_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        } else if (filters?.espectador_de_projeto === false) {
            this.logger.log('filtrando quem não é espectador_de_projeto');
            extraFilter.push({
                PessoaPerfil: {
                    none: {
                        perfil_acesso: {
                            perfil_privilegio: {
                                some: {
                                    privilegio: {
                                        codigo: 'SMAE.espectador_de_projeto',
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        return extraFilter;
    }

    async findByEmailAsHash(email: string) {
        const pessoa = await this.findByEmail(email);
        if (!pessoa) return undefined;

        return this.pessoaAsHash(pessoa);
    }

    async findByEmail(email: string) {
        const pessoa = await this.prisma.pessoa.findUnique({ where: { email: email } });
        return pessoa;
    }

    async findById(id: number) {
        const pessoa = await this.prisma.pessoa.findUnique({ where: { id: id } });
        return pessoa;
    }

    async findBySessionId(sessionId: number) {
        const pessoa = await this.prisma.pessoa.findMany({
            where: {
                PessoaSessoesAtivas: {
                    some: {
                        id: sessionId,
                    },
                },
            },
            select: {
                id: true,
                nome_completo: true,
                email: true,
                nome_exibicao: true,
                senha_bloqueada: true,
                pessoa_fisica: true,
                desativado: true,
            },
        });
        if (!pessoa) return undefined;

        return pessoa[0];
    }

    async newSessionForPessoa(id: number, ip: string): Promise<number> {
        return await this.prisma.$transaction(async (prismaTx: Prisma.TransactionClient) => {
            const pessoaSessao = await prismaTx.pessoaSessao.create({
                data: {
                    criado_ip: ip,
                    pessoa_id: id,
                    criado_em: new Date(Date.now()),
                },
            });

            const pessoaSessaoAtiva = await prismaTx.pessoaSessaoAtiva.create({
                data: {
                    id: pessoaSessao.id,
                    pessoa_id: id,
                },
            });

            return pessoaSessaoAtiva.id;
        });
    }

    async invalidarSessao(id: number, ip: string) {
        await this.prisma.$transaction(async (prismaTx: Prisma.TransactionClient) => {
            await prismaTx.pessoaSessao.update({
                where: { id: id },
                data: {
                    removido_em: new Date(Date.now()),
                    removido_ip: ip,
                },
            });

            await prismaTx.pessoaSessaoAtiva.delete({ where: { id: id } });
        });
    }

    private async invalidarTodasSessoesAtivas(pessoaId: number, prismaTx: Prisma.TransactionClient) {
        await prismaTx.pessoaSessao.updateMany({
            where: { pessoa_id: pessoaId, removido_em: null },
            data: {
                removido_em: new Date(Date.now()),
            },
        });

        await prismaTx.pessoaSessaoAtiva.deleteMany({ where: { pessoa_id: pessoaId } });
    }

    #generateRndPass(pLength: number) {
        const keyListAlpha = 'abcdefghijklmnopqrstuvwxyz',
            keyListAlphaUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            keyListInt = '123456789',
            keyListSpec = '!@*-';
        let password = '';
        let len = Math.ceil(pLength / 2);
        len = len - 1;
        const lenSpec = pLength - 2 * len;

        for (let i = 0; i < len; i++) {
            if (MathRandom() > 0.8) {
                password += keyListAlpha.charAt(Math.floor(MathRandom() * keyListAlpha.length));
            } else {
                password += keyListAlphaUpper.charAt(Math.floor(MathRandom() * keyListAlphaUpper.length));
            }
            password += keyListInt.charAt(Math.floor(MathRandom() * keyListInt.length));
        }

        for (let i = 0; i < lenSpec; i++) password += keyListSpec.charAt(MathRandom(MathRandom() * keyListSpec.length));

        password = password
            .split('')
            .sort(function () {
                return 0.5 - MathRandom();
            })
            .join('');

        return password;
    }

    async listaPerfilAcesso(): Promise<PerfilAcessoPrivilegios[]> {
        const dados = await this.prisma.perfilAcesso.findMany({
            orderBy: { nome: 'asc' },
            select: {
                nome: true,
                descricao: true,
                id: true,
                perfil_privilegio: {
                    select: { privilegio: { select: { nome: true } } },
                },
            },
        });

        return dados as PerfilAcessoPrivilegios[];
    }

    async listaPrivilegiosModulos(pessoaId: number): Promise<ListaPrivilegiosModulos> {
        const dados: ListaPrivilegiosModulos[] = await this.prisma.$queryRaw`
            with perms as (
                select p.codigo as cod_priv, m.codigo as cod_modulos
                from pessoa_perfil pp
                join perfil_acesso pa on pp.perfil_acesso_id = pa.id
                join perfil_privilegio priv on priv.perfil_acesso_id = pa.id
                join privilegio p on p.id = priv.privilegio_id
                join modulo m on p.modulo_id = m.id
                join pessoa pessoa on pessoa.id = pp.pessoa_id AND pessoa.desativado = false
                where pp.pessoa_id = ${pessoaId}
            )
            select
                array_agg(distinct cod_priv) as privilegios,
                array_agg(distinct cod_modulos) as modulos
            from perms;
        `;
        if (!dados[0] || dados[0].modulos === null || !Array.isArray(dados[0].modulos)) {
            throw new BadRequestException(`Seu usuário não tem mais permissões. Entre em contato com o administrador.`);
        }
        return dados[0];
    }

    async novaSenha(novaSenhaDto: NovaSenhaDto, user: PessoaFromJwt) {
        const pessoa = await this.prisma.pessoa.findFirstOrThrow({
            where: { id: user.id },
            select: { senha: true },
        });

        const isPasswordValid = await this.senhaCorreta(novaSenhaDto.senha_corrente, pessoa);
        if (!isPasswordValid) throw new BadRequestException('senha_corrente| Senha atual não confere');

        if (!(await this.escreverNovaSenhaById(user.id, novaSenhaDto.senha_nova, true))) {
            throw new BadRequestException('Senha não pode ser alterada no momento');
        }
    }
}
