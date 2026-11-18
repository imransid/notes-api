import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

// Callers fetch limit + 1 docs: the extra one only signals a next page, so no count query.
export function paginate<T>(docs: T[], { page, limit }: PaginationQueryDto) {
  return {
    data: docs.slice(0, limit),
    page,
    limit,
    hasNext: docs.length > limit,
  };
}
