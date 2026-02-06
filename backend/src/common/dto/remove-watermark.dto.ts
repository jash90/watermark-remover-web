import {
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class WatermarkRegionDto {
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  x: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  y: number;

  @IsNumber()
  @Min(5)
  @Transform(({ value }) => Number(value))
  width: number;

  @IsNumber()
  @Min(5)
  @Transform(({ value }) => Number(value))
  height: number;
}

export class RemoveWatermarkDto {
  @ValidateNested()
  @Type(() => WatermarkRegionDto)
  region: WatermarkRegionDto;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  lossless?: boolean = false;
}
