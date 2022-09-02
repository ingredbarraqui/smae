import { Module } from '@nestjs/common';
import { RegiaoService } from './regiao.service';
import { RegiaoController } from './regiao.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
    imports: [PrismaModule, UploadModule],
    controllers: [RegiaoController],
    providers: [RegiaoService]
})
export class RegiaoModule { }
