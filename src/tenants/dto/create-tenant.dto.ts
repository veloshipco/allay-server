import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Slug can only contain letters, numbers, hyphens, and underscores',
  })
  slug: string;
}