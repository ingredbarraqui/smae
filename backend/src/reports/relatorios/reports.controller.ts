import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { DateTime } from 'luxon';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiPaginatedResponse } from '../../auth/decorators/paginated.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PessoaFromJwt } from '../../auth/models/PessoaFromJwt';
import { SYSTEM_TIMEZONE } from '../../common/date2ymd';
import { FindOneParams } from '../../common/decorators/find-params';
import { PaginatedDto } from '../../common/dto/paginated.dto';
import { UploadService } from '../../upload/upload.service';
import { CreateReportDto } from './dto/create-report.dto';
import { FilterRelatorioDto } from './dto/filter-relatorio.dto';
import { RelatorioDto } from './entities/report.entity';
import { ReportsService } from './reports.service';

@ApiTags('Relatórios')
@Controller('relatorios')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService, private readonly uploadService: UploadService) {}

    @Post()
    @ApiBearerAuth('access-token')
    @ApiUnauthorizedResponse()
    @Roles('Reports.executar')
    @ApiOkResponse({
        description: 'Recebe o arquivo do relatório, ou msg de erro em JSON',
        type: '',
    })
    async create(@Body() dto: CreateReportDto, @CurrentUser() user: PessoaFromJwt, @Res() res: Response) {
        const contentType = 'application/zip';
        const filename = [
            dto.fonte,
            (dto.parametros as any)['tipo'],
            (dto.parametros as any)['ano'],
            (dto.parametros as any)['mes'],
            (dto.parametros as any)['periodo'],
            (dto.parametros as any)['semestre'],
            DateTime.local({ zone: SYSTEM_TIMEZONE }).toISO() + '.zip',
        ]
            .filter((r) => r)
            .join('-');
        const files = await this.reportsService.runReport(dto);
        const zipBuffer = await this.reportsService.zipFiles(files);

        if (dto.salvar_arquivo) {
            const arquivoId = await this.uploadService.uploadReport(dto.fonte, filename, zipBuffer, contentType, user);

            await this.reportsService.saveReport(dto, arquivoId, user);
        }

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': 'attachment; filename="' + filename.replace(/"/g, '-') + '"',
            'Access-Control-Expose-Headers': 'content-disposition',
        });
        res.write(zipBuffer);
        res.send();
    }

    @ApiBearerAuth('access-token')
    @Get()
    @Roles('Reports.executar')
    @ApiPaginatedResponse(RelatorioDto)
    async findAll(@Query() filters: FilterRelatorioDto): Promise<PaginatedDto<RelatorioDto>> {
        return await this.reportsService.findAll(filters);
    }

    @Delete(':id')
    @ApiBearerAuth('access-token')
    @Roles('Reports.remover')
    @ApiUnauthorizedResponse()
    @ApiResponse({ description: 'sucesso ao remover', status: 204 })
    @HttpCode(HttpStatus.NO_CONTENT)
    async remover(@Param() params: FindOneParams, @CurrentUser() user: PessoaFromJwt) {
        await this.reportsService.delete(params.id, user);
        return null;
    }
}
