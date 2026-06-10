import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { subscribeCategories, createCategory, updateCategory, deleteCategory } from '../lib/firestore';
import { seedDatabase } from '../lib/seed';
import type { Category } from '../types';
import { useAuth } from '../hooks/useAuth';

const PRESET_COLORS = ['#8BE04E', '#FF7A1A', '#7C5CFF', '#FFC53D', '#FF4D4D', '#4DCFFF', '#E04EBE', '#9DFF6B'];

export default function Config() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8BE04E');
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    return subscribeCategories(setCategories);
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCategory(newName.trim(), newColor);
    setNewName('');
  }

  async function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editCat) return;
    await updateCategory(editCat.id, editCat.name, editCat.color);
    setEditCat(null);
  }

  async function handleSeed() {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDatabase(user.uid);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-text">Configurações</h1>

      {/* Categories */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-text">Categorias</h2>

        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nova categoria..."
            className="flex-1 min-w-40 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
          />
          <div className="flex gap-1.5 items-center">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: newColor === c ? '#ECEFE6' : 'transparent' }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="bg-primary text-bg px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-glow transition-all flex items-center gap-2"
          >
            <Plus size={15} /> Adicionar
          </button>
        </form>

        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id}>
              {editCat?.id === cat.id ? (
                <form onSubmit={handleUpdateCategory} className="flex flex-wrap gap-3">
                  <input
                    value={editCat.name}
                    onChange={e => setEditCat(ec => ec ? { ...ec, name: e.target.value } : ec)}
                    className="flex-1 min-w-40 bg-surface-2 border border-primary rounded-xl px-3 py-2 text-sm text-text focus:outline-none"
                  />
                  <div className="flex gap-1.5 items-center">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditCat(ec => ec ? { ...ec, color: c } : ec)}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{ background: c, borderColor: editCat.color === c ? '#ECEFE6' : 'transparent' }}
                      />
                    ))}
                  </div>
                  <button type="submit" className="bg-primary text-bg px-3 py-2 rounded-xl text-sm font-bold">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setEditCat(null)}
                    className="text-text-muted hover:text-text px-2">
                    ✕
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-sm text-text">{cat.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditCat(cat)}
                      className="text-text-muted hover:text-violet transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Excluir "${cat.name}"?`)) deleteCategory(cat.id); }}
                      className="text-text-muted hover:text-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">Nenhuma categoria cadastrada</p>
          )}
        </div>
      </div>

      {/* Seed data */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-semibold text-text">Dados de exemplo</h2>
        <p className="text-sm text-text-muted">
          Popula o sistema com ~12 produtos de headshop e ~30 vendas dos últimos 30 dias
          para visualizar o dashboard completo.
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 bg-violet/20 text-violet border border-violet/30 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet/30 transition-all disabled:opacity-60"
        >
          {seeding && <Loader2 size={15} className="animate-spin" />}
          Popular dados de exemplo
        </button>
      </div>
    </div>
  );
}
