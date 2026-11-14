import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const categories = await prisma.category.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const cat = await prisma.category.create({ data: { userId, name: name.trim(), isDefault: false } });
    res.status(201).json(cat);
  } catch (e: any) {
    res.status(400).json({ error: e?.code === 'P2002' ? 'Category already exists' : 'Failed to create category' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    const cat = await prisma.category.update({ where: { id }, data: { name: name.trim() } });
    res.json(cat);
  } catch (e: any) {
    res.status(400).json({ error: e?.code === 'P2002' ? 'Category already exists' : 'Failed to update category' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    if (existing.isDefault) return res.status(400).json({ error: 'Cannot delete default category' });
    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
