import { describe, expect, it } from 'vitest';
import { CategoryMockRepository } from './category.mock.repository';

describe('CategoryMockRepository', () => {
  describe('create', () => {
    it('creates a user-owned category and defaults optional display fields to null', async () => {
      const repository = new CategoryMockRepository();

      const created = await repository.create(
        { name: 'Freelance', type: 'income' },
        9101,
      );

      expect(created).toMatchObject({
        name: 'Freelance',
        type: 'income',
        icon: null,
        color: null,
        isSystem: false,
        userId: 9101,
      });
      expect(created.id).toBeGreaterThan(0);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      await expect(repository.findAll(9102)).resolves.toEqual([]);
    });
  });

  describe('findAll', () => {
    it('returns only categories owned by the requested user', async () => {
      const repository = new CategoryMockRepository();
      const first = await repository.create({ name: 'Food', type: 'expense' }, 9103);
      await repository.create({ name: 'Travel', type: 'expense' }, 9104);

      await expect(repository.findAll(9103)).resolves.toEqual([first]);
    });
  });

  describe('findOne', () => {
    it("does not expose another user's category", async () => {
      const repository = new CategoryMockRepository();
      const category = await repository.create({ name: 'Bonus', type: 'income' }, 9105);

      await expect(repository.findOne(category.id, 9106)).resolves.toBeNull();
      await expect(repository.findOne(category.id, 9105)).resolves.toEqual(category);
    });
  });

  describe('update', () => {
    it('updates an owned category while preserving its owner and identity', async () => {
      const repository = new CategoryMockRepository();
      const category = await repository.create({ name: 'Meals', type: 'expense' }, 9107);

      await expect(
        repository.update(category.id, { name: 'Dining' }, 9107),
      ).resolves.toMatchObject({
        id: category.id,
        name: 'Dining',
        userId: 9107,
      });
      await expect(repository.findOne(category.id, 9107)).resolves.toMatchObject({
        name: 'Dining',
      });
    });

    it('returns null and leaves the category unchanged for a different owner', async () => {
      const repository = new CategoryMockRepository();
      const category = await repository.create({ name: 'Meals', type: 'expense' }, 9108);

      await expect(
        repository.update(category.id, { name: 'Dining' }, 9109),
      ).resolves.toBeNull();
      await expect(repository.findOne(category.id, 9108)).resolves.toMatchObject({
        name: 'Meals',
      });
    });
  });

  describe('delete', () => {
    it('leaves a category in place when the requester is not its owner', async () => {
      const repository = new CategoryMockRepository();
      const category = await repository.create({ name: 'Books', type: 'expense' }, 9110);

      await repository.delete(category.id, 9111);

      await expect(repository.findOne(category.id, 9110)).resolves.toEqual(category);
    });

    it('removes a category owned by the requester', async () => {
      const repository = new CategoryMockRepository();
      const category = await repository.create({ name: 'Books', type: 'expense' }, 9112);

      await repository.delete(category.id, 9112);

      await expect(repository.findOne(category.id, 9112)).resolves.toBeNull();
    });
  });
});