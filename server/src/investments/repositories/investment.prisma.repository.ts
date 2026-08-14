import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { InvestmentRecord } from '../investment.types';
import { CreateInvestmentDto } from '../dto/create-investment.dto';
import { UpdateInvestmentDto } from '../dto/update-investment.dto';
import { IInvestmentDataSourcePort } from './investment.datasource.port';
import { parseOptionalDateInput } from '../../common/utils/date-input';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

type PrismaInvestmentRow = any;

const mapInvestmentOutput = (investment: PrismaInvestmentRow): InvestmentRecord => ({
  id: investment.id,
  userId: investment.userId,
  accountId: investment.accountId,
  assetTaxonomyId: investment.assetTaxonomyId,
  assetTypeMetaId: investment.assetTypeMetaId,
  assetCategoryMetaId: investment.assetCategoryMetaId,
  name: investment.name,
  assetType: investment.assetTypeRef.code,
  assetCategory: investment.assetCategoryRef.code,
  institutionName: investment.institutionName,
  referenceNumber: investment.referenceNumber,
  status: investment.status,
  currency: investment.currency,
  startDate: investment.startDate,
  maturityDate: investment.maturityDate,
  totalInvested: investment.totalInvested,
  currentValue: investment.currentValue,
  currentValueSource: investment.currentValueSource,
  lastValuationAt: investment.lastValuationAt,
  insuranceCover: investment.insuranceCover,
  contributionMode: investment.contributionMode,
  notes: investment.notes,
  createdAt: investment.createdAt,
  updatedAt: investment.updatedAt,
});

@Injectable()
export class InvestmentPrismaRepository implements IInvestmentDataSourcePort {
  private didAttemptNullMetaRepair = false;

  constructor(private prisma: PrismaService) {}

  private async repairNullMetaIdsIfNeeded(): Promise<void> {
    if (this.didAttemptNullMetaRepair) {
      return;
    }

    const prismaClient = this.prisma as any;

    await prismaClient.$executeRawUnsafe(`
      WITH fallback AS (
        SELECT
          (
            SELECT ref."id"
            FROM public.app_meta_config_ref ref
            WHERE ref."module" = 'INVESTMENT'
              AND ref."configType" = 'ASSET_TYPE'
              AND ref."code" = 'ALTERNATIVE'
              AND ref."isActive" = true
            LIMIT 1
          ) AS fallback_type_id,
          (
            SELECT ref."id"
            FROM public.app_meta_config_ref ref
            WHERE ref."module" = 'INVESTMENT'
              AND ref."configType" = 'ASSET_CATEGORY'
              AND ref."code" = 'OTHER_ALTERNATIVE'
              AND ref."isActive" = true
            LIMIT 1
          ) AS fallback_category_id
      ),
      resolved AS (
        SELECT
          i."id",
          COALESCE(
            i."assetCategoryMetaId",
            tax."defaultAssetCategoryMetaId",
            fallback.fallback_category_id
          ) AS resolved_category_id,
          COALESCE(
            i."assetTypeMetaId",
            category_from_investment."parentId",
            category_from_taxonomy."parentId",
            tax."defaultAssetTypeMetaId",
            fallback.fallback_type_id
          ) AS resolved_type_id
        FROM public.investments i
        CROSS JOIN fallback
        LEFT JOIN public.investment_asset_taxonomy tax
          ON tax."id" = i."assetTaxonomyId"
        LEFT JOIN public.app_meta_config_ref category_from_investment
          ON category_from_investment."id" = i."assetCategoryMetaId"
         AND category_from_investment."module" = 'INVESTMENT'
         AND category_from_investment."configType" = 'ASSET_CATEGORY'
        LEFT JOIN public.app_meta_config_ref category_from_taxonomy
          ON category_from_taxonomy."id" = tax."defaultAssetCategoryMetaId"
         AND category_from_taxonomy."module" = 'INVESTMENT'
         AND category_from_taxonomy."configType" = 'ASSET_CATEGORY'
      )
      UPDATE public.investments i
      SET
        "assetCategoryMetaId" = resolved.resolved_category_id,
        "assetTypeMetaId" = resolved.resolved_type_id
      FROM resolved
      WHERE i."id" = resolved."id"
        AND (i."assetTypeMetaId" IS NULL OR i."assetCategoryMetaId" IS NULL)
        AND resolved.resolved_type_id IS NOT NULL
        AND resolved.resolved_category_id IS NOT NULL;
    `);

    const unresolvedRows = await prismaClient.$queryRawUnsafe(`
      SELECT COUNT(*)::int AS unresolved_count
      FROM public.investments
      WHERE "assetTypeMetaId" IS NULL OR "assetCategoryMetaId" IS NULL;
    `);

    const unresolvedCount = unresolvedRows[0]?.unresolved_count ?? 0;
    if (unresolvedCount > 0) {
      throw new Error(
        `Found ${unresolvedCount} investments with unresolved asset metadata references after repair`,
      );
    }

    this.didAttemptNullMetaRepair = true;
  }

  private async resolveAssetMetaIds(assetType: string, assetCategory: string) {
    const prismaClient = this.prisma as any;

    const [assetTypeMeta, assetCategoryMeta] = await Promise.all([
      prismaClient.appMetaConfigRef.findFirst({
        where: {
          module: 'INVESTMENT',
          configType: 'ASSET_TYPE',
          code: assetType,
          isActive: true,
        },
      }),
      prismaClient.appMetaConfigRef.findFirst({
        where: {
          module: 'INVESTMENT',
          configType: 'ASSET_CATEGORY',
          code: assetCategory,
          isActive: true,
        },
      }),
    ]);

    if (!assetTypeMeta || !assetCategoryMeta) {
      throw new Error('Investment asset classification metadata not found');
    }

    if (assetCategoryMeta.parentId !== assetTypeMeta.id) {
      throw new Error('Investment asset category does not belong to the selected asset type');
    }

    return {
      assetTypeMetaId: assetTypeMeta.id,
      assetCategoryMetaId: assetCategoryMeta.id,
    };
  }

  async create(data: CreateInvestmentDto, userId: number): Promise<InvestmentRecord> {
    const { assetTypeMetaId, assetCategoryMetaId } = await this.resolveAssetMetaIds(
      data.assetType,
      data.assetCategory,
    );
    const prismaClient = this.prisma as any;

    const createData: any = {
      userId,
      accountId: normalizeNullableNumber(data.accountId),
      assetTaxonomyId: normalizeNullableNumber(data.assetTaxonomyId),
      assetTypeMetaId,
      assetCategoryMetaId,
      name: data.name,
      institutionName: data.institutionName,
      referenceNumber: data.referenceNumber ?? null,
      status: data.status,
      currency: data.currency,
      totalInvested: data.totalInvested,
      currentValue: data.currentValue,
      currentValueSource: data.currentValueSource,
      insuranceCover: data.insuranceCover,
      contributionMode: data.contributionMode as any,
      notes: data.notes ?? null,
      startDate: parseOptionalDateInput(data.startDate, 'startDate'),
      maturityDate: parseOptionalDateInput(data.maturityDate, 'maturityDate'),
      lastValuationAt: parseOptionalDateInput(data.lastValuationAt, 'lastValuationAt'),
    };

    const investment = await prismaClient.investment.create({
      data: createData,
      include: {
        assetTypeRef: true,
        assetCategoryRef: true,
      },
    });

    return mapInvestmentOutput(investment);
  }

  async findAll(userId: number): Promise<InvestmentRecord[]> {
    await this.repairNullMetaIdsIfNeeded();
    const prismaClient = this.prisma as any;

    const investments = await prismaClient.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assetTypeRef: true,
        assetCategoryRef: true,
      },
    });

    return investments.map(mapInvestmentOutput);
  }

  async findOne(id: number, userId: number): Promise<InvestmentRecord | null> {
    await this.repairNullMetaIdsIfNeeded();
    const prismaClient = this.prisma as any;

    const investment = await prismaClient.investment.findFirst({
      where: { id, userId },
      include: {
        assetTypeRef: true,
        assetCategoryRef: true,
      },
    });

    return investment ? mapInvestmentOutput(investment) : null;
  }

  async findById(id: number): Promise<InvestmentRecord | null> {
    await this.repairNullMetaIdsIfNeeded();
    const prismaClient = this.prisma as any;

    const investment = await prismaClient.investment.findUnique({
      where: { id },
      include: {
        assetTypeRef: true,
        assetCategoryRef: true,
      },
    });

    return investment ? mapInvestmentOutput(investment) : null;
  }

  async update(id: number, data: UpdateInvestmentDto, userId: number): Promise<InvestmentRecord | null> {
    await this.repairNullMetaIdsIfNeeded();
    const prismaClient = this.prisma as any;

    const existing = await prismaClient.investment.findFirst({
      where: { id, userId },
      include: {
        assetTypeRef: true,
        assetCategoryRef: true,
      },
    });

    if (!existing) return null;

    const classificationChanged = data.assetType !== undefined || data.assetCategory !== undefined;
    const assetTypeMetaId = classificationChanged
      ? (await this.resolveAssetMetaIds(
          data.assetType ?? existing.assetTypeRef.code,
          data.assetCategory ?? existing.assetCategoryRef.code,
        )).assetTypeMetaId
      : existing.assetTypeMetaId;
    const assetCategoryMetaId = classificationChanged
      ? (await this.resolveAssetMetaIds(
          data.assetType ?? existing.assetTypeRef.code,
          data.assetCategory ?? existing.assetCategoryRef.code,
        )).assetCategoryMetaId
      : existing.assetCategoryMetaId;

    const updateData: any = {
      accountId: data.accountId !== undefined ? normalizeNullableNumber(data.accountId) : undefined,
      assetTaxonomyId: data.assetTaxonomyId !== undefined ? normalizeNullableNumber(data.assetTaxonomyId) : undefined,
      name: data.name,
      institutionName: data.institutionName,
      referenceNumber: data.referenceNumber,
      status: data.status,
      currency: data.currency,
      totalInvested: data.totalInvested,
      currentValue: data.currentValue,
      currentValueSource: data.currentValueSource,
      insuranceCover: data.insuranceCover,
      contributionMode: data.contributionMode as any,
      notes: data.notes,
      startDate: data.startDate !== undefined ? parseOptionalDateInput(data.startDate, 'startDate') : undefined,
      maturityDate: data.maturityDate !== undefined ? parseOptionalDateInput(data.maturityDate, 'maturityDate') : undefined,
      lastValuationAt: data.lastValuationAt !== undefined ? parseOptionalDateInput(data.lastValuationAt, 'lastValuationAt') : undefined,
    };

    if (classificationChanged) {
      updateData.assetTypeMetaId = assetTypeMetaId;
      updateData.assetCategoryMetaId = assetCategoryMetaId;
    }

    const investment = await prismaClient.investment.update({
      where: { id },
      data: updateData,
      include: {
        assetTypeRef: true,
        assetCategoryRef: true,
      },
    });

    return mapInvestmentOutput(investment);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.repairNullMetaIdsIfNeeded();
    const prismaClient = this.prisma as any;

    const existing = await prismaClient.investment.findFirst({
      where: { id, userId },
    });

    if (!existing) return;

    await prismaClient.investment.delete({
      where: { id },
    });
  }
}