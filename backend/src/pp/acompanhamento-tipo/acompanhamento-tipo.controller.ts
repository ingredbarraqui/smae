import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ListaDePrivilegios } from 'src/common/ListaDePrivilegios';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PessoaFromJwt } from '../../auth/models/PessoaFromJwt';
import { FindOneParams } from '../../common/decorators/find-params';
import { RecordWithId } from '../../common/dto/record-with-id.dto';
import { AcompanhamentoTipoService } from './acompanhamento-tipo.service';
import { CreateTipoAcompanhamentoDto } from './dto/create-acompanhamento-tipo.dto';
import { UpdateAcompanhamentoTipoDto } from './dto/update-acompanhamento-tipo.dto';
import { ListAcompanhamentoTipoDto } from './entities/acompanhament-tipo.entities.dto';

// provavelmente não é pra PROJETO_READONLY_ROLES criar esse tipo de objeto, conferir com o Lucas/FGV
const roles: ListaDePrivilegios[] = ['Projeto.administrador', 'Projeto.administrador_no_orgao'];

@Controller('acompanhamento-tipo')
@ApiTags('Acompanhamento - Tipo')
export class AcompanhamentoTipoController {
    constructor(private readonly acompanhamentoTipoService: AcompanhamentoTipoService) {}

    @Post('')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles(...roles)
    async create(
        @Body() createAcompanhamentoTipoDto: CreateTipoAcompanhamentoDto,
        @CurrentUser() user: PessoaFromJwt
    ): Promise<RecordWithId> {
        return await this.acompanhamentoTipoService.create(createAcompanhamentoTipoDto, user);
    }

    @Get('')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles(...roles)
    async findAll(@CurrentUser() user: PessoaFromJwt): Promise<ListAcompanhamentoTipoDto> {
        return {
            linhas: await this.acompanhamentoTipoService.findAll(user),
        };
    }

    @Patch(':id')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles(...roles)
    @ApiNoContentResponse()
    @HttpCode(HttpStatus.ACCEPTED)
    async update(
        @Param() params: FindOneParams,
        @Body() dto: UpdateAcompanhamentoTipoDto,
        @CurrentUser() user: PessoaFromJwt
    ): Promise<RecordWithId> {
        return await this.acompanhamentoTipoService.update(params.id, dto, user);
    }

    @Delete(':id')
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles(...roles)
    @ApiNoContentResponse()
    @HttpCode(HttpStatus.ACCEPTED)
    async remove(@Param() params: FindOneParams, @CurrentUser() user: PessoaFromJwt) {
        await this.acompanhamentoTipoService.remove(params.id, user);
        return '';
    }
}
