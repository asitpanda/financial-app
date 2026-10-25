import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AssetTaxonomyMockRepository } from './asset-taxonomy.mock.repository';
import type { InvestmentAssetTaxonomyWriteInput } from '../investment-asset-taxonomy.types';

const userId = 987321;
const otherUserId = 987322;

function createInput(
  overrides: Partial<InvestmentAssetTaxonomyWriteInput> = {},
): InvestmentAssetTaxonomyWriteInput {
  return {
    label: 'Equities',
    nodeType: 'CATEGORY',
    level: 1,
    userId,
    ...overrides,
  };
}

describe('AssetTaxonomyMockRepository', () => {
  let repository: AssetTaxonomyMockRepository;

  beforeEach(() => {
    repository = new AssetTaxonomyMockRepository();
  });

  afterEach(async () => {
    for (const scopedUserId of [userId, otherUserId]) {
      const nodes = await repository.findAll(scopedUserId);
      for (const node of nodes) {
        await repository.delete(node.id, scopedUserId);
      }
    }
  });

  describe('create', () => {
    it('normalizes parent and numeric values and applies defaults', async () => {
      const created = await repository.create(createInput({ level: 2, parentId: '' as never }));

      expect(created).toMatchObject({
        userId,
        label: 'Equities',
        level: 2,
        parentId: null,
        defaultAssetType: null,
        defaultAssetCategory: null,
        sortOrder: 0,
        isActive: true,
      });
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBe(created.createdAt);
    });

    it('rejects a parent that is not owned by the requested user', async () => {
      const parent = await repository.create(
        createInput({ userId: otherUserId, label: 'Other user root' }),
      );

      await expect(
        repository.create(createInput({ level: 2, parentId: parent.id })),
      ).rejects.toThrow('Parent taxonomy node not found for user');
    });
  });

  describe('findAll', () => {
    it('returns only the requested user’s nodes in hierarchy and display order', async () => {
      await repository.create(createInput({ label: 'Later', sortOrder: 5 }));
      await repository.create(createInput({ label: 'Zulu', sortOrder: 0 }));
      await repository.create(createInput({ label: 'Alpha', sortOrder: 0 }));
      await repository.create(
        createInput({ userId: otherUserId, label: 'Other user node' }),
      );

      const nodes = await repository.findAll(userId);

      expect(nodes.map(({ label, level, sortOrder }) => ({ label, level, sortOrder }))).toEqual([
        { label: 'Alpha', level: 1, sortOrder: 0 },
        { label: 'Zulu', level: 1, sortOrder: 0 },
        { label: 'Later', level: 1, sortOrder: 5 },
      ]);
    });
  });

  describe('findOne', () => {
    it('does not expose a node owned by another user', async () => {
      const node = await repository.create(
        createInput({ userId: otherUserId, label: 'Private node' }),
      );

      await expect(repository.findOne(node.id, userId)).resolves.toBeNull();
      await expect(repository.findOne(node.id, otherUserId)).resolves.toBe(node);
    });
  });

  describe('update', () => {
    it('updates only supplied fields and normalizes parent and numeric values', async () => {
      const parent = await repository.create(createInput({ label: 'Parent' }));
      const child = await repository.create(
        createInput({ label: 'Child', level: 2, parentId: parent.id }),
      );

      const updated = await repository.update(child.id, userId, {
        label: 'Renamed child',
        parentId: '',
        level: '3' as never,
        sortOrder: '8' as never,
      });

      expect(updated).toMatchObject({
        id: child.id,
        userId,
        label: 'Renamed child',
        parentId: null,
        level: 3,
        sortOrder: 8,
      });
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(child.updatedAt.getTime());
    });

    it('returns null when the node is not owned by the requested user', async () => {
      const node = await repository.create(createInput({ label: 'Owned node' }));

      await expect(
        repository.update(node.id, otherUserId, { label: 'Unauthorized change' }),
      ).resolves.toBeNull();
      await expect(repository.findOne(node.id, userId)).resolves.toMatchObject({
        label: 'Owned node',
      });
    });
  });

  describe('updateLevelsForDescendants', () => {
    it('changes levels only for matching nodes owned by the requested user', async () => {
      const node = await repository.create(createInput({ label: 'Owned node' }));
      const otherNode = await repository.create(
        createInput({ userId: otherUserId, label: 'Other node' }),
      );

      await repository.updateLevelsForDescendants(userId, [
        { id: node.id, level: 3 },
        { id: otherNode.id, level: 4 },
      ]);

      await expect(repository.findOne(node.id, userId)).resolves.toMatchObject({ level: 3 });
      await expect(
        repository.findOne(otherNode.id, otherUserId),
      ).resolves.toMatchObject({ level: 1 });
    });
  });

  describe('delete', () => {
    it('deletes the node and its direct children for the owner', async () => {
      const parent = await repository.create(createInput({ label: 'Parent' }));
      const child = await repository.create(
        createInput({ label: 'Child', level: 2, parentId: parent.id }),
      );
      const otherUserNode = await repository.create(
        createInput({ userId: otherUserId, label: 'Other user node' }),
      );

      await repository.delete(parent.id, userId);

      await expect(repository.findOne(parent.id, userId)).resolves.toBeNull();
      await expect(repository.findOne(child.id, userId)).resolves.toBeNull();
      await expect(
        repository.findOne(otherUserNode.id, otherUserId),
      ).resolves.toBe(otherUserNode);
    });
  });
});
