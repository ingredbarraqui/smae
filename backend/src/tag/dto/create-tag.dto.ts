import { Type } from "class-transformer"
import { IsOptional, IsPositive, IsString, MaxLength, ValidateIf } from "class-validator"

export class CreateTagDto {
    /**
    * Descrição
    */
    @IsString({ message: '$property| descrição: Precisa ser alfanumérico' })
    @MaxLength(250, { message: '$property| descrição: Máximo 250 caracteres' })
    descricao: string

    /**
    * Upload do Ícone
    */
    @IsOptional()
    @IsString({ message: '$property| upload_token de um arquivo de ícone' })
    upload_icone?: string

    /**
    * ID do PDM
    */
    @IsPositive({ message: '$property| Necessário ID do PDM' })
    @Type(() => Number)
    pdm_id: number

    /**
    * ID do ODS (opcional, enviar null para remover/não existir)
    */
    @IsOptional()
    @IsPositive({ message: '$property| ODS precisa não existir (manter antigo), ser nulo (null) ou númerico' })
    @ValidateIf((object, value) => value !== null)
    @Type(() => Number)
    ods_id?: number
}
