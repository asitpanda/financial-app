import { BadRequestException } from '@nestjs/common';

export function parseRequiredDateInput(value: unknown, fieldName: string): Date {
  if (value === undefined || value === null || value === '') {
    throw new BadRequestException({
      field: fieldName,
      message: `Missing ${fieldName}.`,
    });
  }

  const parsedDate = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));

  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException({
      field: fieldName,
      message: `Invalid ${fieldName}: expected an ISO-8601 date or YYYY-MM-DD value. Received ${value}.`,
    });
  }

  return parsedDate;
}

export function parseOptionalDateInput(value: unknown, fieldName: string): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseRequiredDateInput(value, fieldName);
}