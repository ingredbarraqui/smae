import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PessoaFromJwt } from '../auth/models/PessoaFromJwt';
import { FindOneParams } from '../common/decorators/find-params';
import { RecordWithId } from '../common/dto/record-with-id.dto';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { DetalhePessoaDto } from './dto/detalhe-pessoa.dto';
import { FilterPessoaDto } from './dto/filter-pessoa.dto';
import { ListPessoaDto, ListPessoaReducedDto } from './dto/list-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { PessoaService } from './pessoa.service';

@ApiTags('Pessoa')
@Controller('pessoa')
export class PessoaController {
    constructor(private readonly pessoaService: PessoaService) {}

    @Post()
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles('CadastroPessoa.inserir')
    create(@Body() createPessoaDto: CreatePessoaDto, @CurrentUser() user: PessoaFromJwt): Promise<RecordWithId> {
        return this.pessoaService.criarPessoa(createPessoaDto, user);
    }

    @ApiBearerAuth('access-token')
    @Get()
    @Roles(
        'CadastroPessoa.inserir',
        'CadastroPessoa.editar',
        'CadastroPessoa.inativar',
        'PDM.admin_cp',
        'PDM.tecnico_cp',
        'PDM.ponto_focal',
        'SMAE.colaborador_de_projeto',
        'SMAE.gestor_de_projeto',
        'Projeto.administrador',
        'Projeto.administrador_no_orgao'
    )
    async findAll(@Query() filters: FilterPessoaDto): Promise<ListPessoaDto> {
        return { linhas: await this.pessoaService.findAll(filters) };
    }

    @ApiBearerAuth('access-token')
    @Get('reduzido')
    @Roles(
        'CadastroPessoa.inserir',
        'CadastroPessoa.editar',
        'CadastroPessoa.inativar',
        'PDM.admin_cp',
        'PDM.tecnico_cp',
        'PDM.ponto_focal',
        'SMAE.colaborador_de_projeto',
        'SMAE.gestor_de_projeto',
        'SMAE.espectador_de_projeto',
        'Projeto.administrador',
        'Projeto.administrador_no_orgao',
        'CadastroGrupoPortfolio.administrador',
        'CadastroGrupoPortfolio.administrador_no_orgao'
    )
    async findAllReduced(@Query() filters: FilterPessoaDto): Promise<ListPessoaReducedDto> {
        const list = await this.pessoaService.findAll(filters);

        return {
            linhas: list.map((r) => {
                return {
                    id: r.id,
                    nome_exibicao: r.nome_exibicao,
                    orgao_id: r.orgao_id,
                };
            }),
        };
    }

    @Patch(':id')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles('CadastroPessoa.editar')
    async update(
        @Param() params: FindOneParams,
        @Body() updatePessoaDto: UpdatePessoaDto,
        @CurrentUser() user: PessoaFromJwt
    ): Promise<RecordWithId> {
        return await this.pessoaService.update(+params.id, updatePessoaDto, user);
    }

    @Get(':id')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles('CadastroPessoa.inserir', 'CadastroPessoa.editar', 'CadastroPessoa.inativar')
    async get(@Param() params: FindOneParams, @CurrentUser() user: PessoaFromJwt): Promise<DetalhePessoaDto> {
        return await this.pessoaService.getDetail(+params.id, user);
    }
}
