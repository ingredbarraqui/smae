import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateRelPrevisaoCustoDto } from './dto/create-previsao-custo.dto';
import { ListPrevisaoCustoDto } from './entities/previsao-custo.entity';
import { PrevisaoCustoService } from './previsao-custo.service';

@ApiTags('Relatórios - API')
@Controller('relatorio/previsao-custo')
export class PrevisaoCustoController {
    constructor(private readonly previsaoCustoService: PrevisaoCustoService) {}

    @Post()
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles('Reports.executar')
    async create(@Body() createPrevisaoCustDto: CreateRelPrevisaoCustoDto): Promise<ListPrevisaoCustoDto> {
        return await this.previsaoCustoService.create(createPrevisaoCustDto);
    }
}
