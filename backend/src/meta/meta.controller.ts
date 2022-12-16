import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, ParseArrayPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiProduces, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PessoaFromJwt } from '../auth/models/PessoaFromJwt';
import { FindOneParams } from '../common/decorators/find-params';
import { RecordWithId } from '../common/dto/record-with-id.dto';
import { CreateMetaDto, ListDadosMetaIniciativaAtividadesDto } from './dto/create-meta.dto';
import { FilterMetaDto } from './dto/filter-meta.dto';
import { ListMetaDto } from './dto/list-meta.dto';
import { UpdateMetaDto } from './dto/update-meta.dto';
import { Meta } from "./entities/meta.entity";
import { MetaService } from './meta.service';

@ApiTags('Meta')
@Controller('meta')
export class MetaController {
    constructor(private readonly metaService: MetaService) { }

    @Post()
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse({ description: 'Precisa: CadastroMeta.inserir' })
    @Roles('CadastroMeta.inserir')
    async create(@Body() createMetaDto: CreateMetaDto, @CurrentUser() user: PessoaFromJwt): Promise<RecordWithId> {
        return await this.metaService.create(createMetaDto, user);
    }

    @ApiBearerAuth('access-token')
    @Get()
    @ApiProduces("application/json", "text/csv", "text/csv; unwind-all")
    //@Roles('CadastroMeta.inserir', 'CadastroMeta.editar', 'CadastroMeta.remover')
    async findAll(@Query() filters: FilterMetaDto): Promise<ListMetaDto> {
        // TODO filtrar por apenas painel , se a pessoa nao tiver essas permissoes acima
        return { 'linhas': await this.metaService.findAll(filters) };
    }

    @ApiBearerAuth('access-token')
    @Get('iniciativas-atividades')
    //@Roles('PDM.admin_cp', 'PDM.tecnico_cp', 'PDM.ponto_focal', '')
    async buscaMetasIniciativaAtividades(
        @Query('meta_ids', new ParseArrayPipe({ items: Number, separator: ',' })) ids: number[]
    ): Promise<ListDadosMetaIniciativaAtividadesDto> {
        return { linhas: await this.metaService.buscaMetasIniciativaAtividades(ids) };
    }

    // precisa ficar depois
    @ApiBearerAuth('access-token')
    @ApiNotFoundResponse()
    @Get(':id')
    async findOne(@Param() params: FindOneParams): Promise<Meta> {
        const r = await this.metaService.findAll({ id: params.id });
        if (!r.length) throw new HttpException('Meta não encontrada.', 404);
        return r[0];
    }

    @Patch(':id')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse({ description: 'Precisa: CadastroMeta.editar' })
    @Roles('CadastroMeta.editar')
    async update(@Param() params: FindOneParams, @Body() updateMetaDto: UpdateMetaDto, @CurrentUser() user: PessoaFromJwt) {
        return await this.metaService.update(+params.id, updateMetaDto, user);
    }

    @Delete(':id')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse({ description: 'Precisa: CadastroMeta.remover' })
    @Roles('CadastroMeta.remover')
    @ApiNoContentResponse()
    @HttpCode(HttpStatus.ACCEPTED)
    async remove(@Param() params: FindOneParams, @CurrentUser() user: PessoaFromJwt) {
        await this.metaService.remove(+params.id, user);
        return '';
    }


}
