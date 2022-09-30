import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, IsPositive, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

/**
* Este export é MetaOrgaoParticipante e não IniciativaOrgaoParticipante
* pois, de acordo com o caso de uso, Iniciativa é uma abstração/granularização
* da Meta, portanto sempre possuirá uma meta atrelada.
*/
export class MetaOrgaoParticipante {
    /**
    * orgão participante é responsável? Pelo menos um precisa ser responsável
    * @example false
    */
    @IsBoolean({ message: 'Campo responsavel precisa ser do tipo Boolean' })
    responsavel: boolean

    /**
    * órgão
    * @example 1
    */
    @IsPositive({ message: '$property| orgao_id' })
    @Type(() => Number)
    orgao_id: number;

    /**
    * lista dos participantes? pelo menos uma pessoa
    * @example "[4, 5, 6]"
    */
    @IsArray({ message: '$property| precisa ser um array' })
    @ArrayMinSize(1, { message: '$property| precisa ter um item' })
    @ArrayMaxSize(100, { message: '$property| precisa ter no máximo 100 items' })
    participantes: number[]

}

export class CreateIniciativaDto {
    /**
    * meta_id
    */
    @IsPositive({ message: '$property| tema precisa ser um número ou null' })
    @Type(() => Number)
    @ValidateIf((object, value) => value !== null)
    meta_id: number

    /**
    * Código
    */
    @IsString({ message: '$property| código: Precisa ser alfanumérico, campo obrigatório' })
    @MinLength(1, { message: '$property| código: pelo menos um caractere' })
    @MaxLength(30, { message: '$property| código: até 30 caracteres' })
    codigo: string

    /**
    * título
    */
    @IsString({ message: '$property| título: Precisa ser alfanumérico, campo obrigatório' })
    @MinLength(1, { message: '$property| título: pelo menos um caractere' })
    @MaxLength(250, { message: '$property| título: 250 caracteres' })
    titulo: string

    /**
    * contexto
    */
    @IsString({ message: '$property| contexto: Precisa ser alfanumérico' })
    @IsOptional()
    contexto?: string

    /**
   * complemento
   */
    @IsString({ message: '$property| contexto: Precisa ser alfanumérico' })
    @IsOptional()
    complemento?: string

    /**
    * compoe_indicador_meta
    */
    @IsBoolean({ message: '$property| precisa ser um boolean' })
    compoe_indicador_meta: boolean

    /**
    * status
    */
    @IsString({ message: '$property| status: Precisa ser alfanumérico, campo obrigatório' })
    @MinLength(1, { message: '$property| status: pelo menos um caractere' })
    @IsOptional()
    @MaxLength(250, { message: '$property| status: 250 caracteres' })
    status?: string

    /**
    * Quais são os orgaos participantes e seus membros responsáveis
    */
    @IsArray({ message: 'precisa ser uma array, campo obrigatório' })
    orgaos_participantes?: MetaOrgaoParticipante[]

    /**
    * ID das pessoas que são coordenadores
    * @example "[1, 2, 3]"
    */
    @IsArray({ message: '$property| responsável(eis) na coordenadoria de projetos: precisa ser uma array, campo obrigatório' })
    @ArrayMinSize(1, { message: '$property| responsável(eis) na coordenadoria de projetos: precisa ter pelo menos um item' })
    @ArrayMaxSize(100, { message: '$property| responsável(eis) na coordenadoria de projetos: precisa ter no máximo 100 items' })
    coordenadores_cp?: number[]

    /**
    * ID das tag que serão associadas
    * @example "[1, 2, 3]"
    */
    @IsOptional()
    @IsArray({ message: '$property| tag(s): precisa ser uma array.' })
    @ArrayMinSize(1, { message: '$property| tag(s): precisa ter pelo menos um item' })
    @ArrayMaxSize(100, { message: '$property| tag(s): precisa ter no máximo 100 items' })
    tags?: number[]

    @IsOptional()
    @IsBoolean({ message: 'Campo ativo precisa ser do tipo Boolean' })
    ativo?: boolean
}