'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Tour, NavPanel, NavPanelItem } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronRight, ChevronDown, ToggleLeft, ToggleRight, ExternalLink, Layers } from 'lucide-react';

interface NavPanelEditorProps {
  tour: Tour;
}

// ─── ItemRow must live OUTSIDE NavPanelEditor so React does not treat it as
// a new component type on every re-render, which would unmount the input and
// lose focus after each keystroke.
interface ItemRowProps {
  item: NavPanelItem;
  depth: number;
  scenes: Tour['scenes'];
  onUpdate: (id: string, patch: Partial<NavPanelItem>) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function ItemRow({ item, depth, scenes, onUpdate, onRemove, onAddChild }: ItemRowProps) {
  const [itemExpanded, setItemExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className={cn('space-y-1', depth > 0 && 'ml-4')}>
      <div className="flex items-center gap-1.5 group">
        {/* Expand toggle for items with children */}
        <button
          onClick={() => setItemExpanded((v) => !v)}
          className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-white flex-shrink-0"
        >
          {hasChildren
            ? itemExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            : <span className="w-3" />}
        </button>

        {/* Icon */}
        <input
          type="text"
          value={item.icon ?? ''}
          onChange={(e) => onUpdate(item.id, { icon: e.target.value })}
          className="w-8 text-center bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-sm"
          placeholder="📍"
        />

        {/* Label */}
        <input
          type="text"
          value={item.label}
          onChange={(e) => onUpdate(item.id, { label: e.target.value })}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 min-w-0"
          placeholder="Etiqueta"
        />

        {/* Type toggle: scene vs external */}
        <button
          onClick={() => onUpdate(item.id, { type: item.type === 'scene' ? 'external' : 'scene' })}
          title={item.type === 'scene' ? 'Escena interna' : 'URL externa'}
          className={cn(
            'flex-shrink-0 p-1 rounded transition-colors',
            item.type === 'external' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {/* Add child (only at depth 0) */}
        {depth === 0 && (
          <button
            onClick={() => { onAddChild(item.id); setItemExpanded(true); }}
            title="Agregar sub-elemento"
            className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-300 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 p-1 text-gray-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target selector */}
      {(itemExpanded || !hasChildren) && (
        <div className={cn('ml-6 pl-2', depth > 0 && 'ml-3')}>
          {item.type === 'scene' ? (
            <select
              value={item.sceneId ?? ''}
              onChange={(e) => onUpdate(item.id, { sceneId: e.target.value || undefined })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-400"
            >
              <option value="">— Seleccionar escena —</option>
              {scenes.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="url"
              value={item.url ?? ''}
              onChange={(e) => onUpdate(item.id, { url: e.target.value || undefined })}
              placeholder="https://360-flax.vercel.app/viewer/otro-tour"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-400 placeholder-gray-600"
            />
          )}
        </div>
      )}

      {/* Children */}
      {hasChildren && itemExpanded && (
        <div className="space-y-1">
          {item.children!.map((child) => (
            <ItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              scenes={scenes}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function NavPanelEditor({ tour }: NavPanelEditorProps) {
  const updateTour = useTourStore((s) => s.updateTour);
  const panel = tour.navPanel ?? { enabled: false, items: [] };

  const save = useCallback((patch: Partial<NavPanel>) => {
    updateTour({ navPanel: { ...panel, ...patch } });
  }, [panel, updateTour]);

  const addItem = useCallback((parentId?: string) => {
    const newItem: NavPanelItem = {
      id: uuidv4(),
      label: 'Nueva sección',
      type: 'scene',
      icon: '📍',
    };

    if (!parentId) {
      save({ items: [...panel.items, newItem] });
    } else {
      const addChild = (items: NavPanelItem[]): NavPanelItem[] =>
        items.map((it) =>
          it.id === parentId
            ? { ...it, children: [...(it.children ?? []), newItem] }
            : { ...it, children: it.children ? addChild(it.children) : undefined }
        );
      save({ items: addChild(panel.items) });
    }
  }, [panel, save]);

  const removeItem = useCallback((itemId: string) => {
    const removeDeep = (items: NavPanelItem[]): NavPanelItem[] =>
      items.filter((it) => it.id !== itemId).map((it) => ({
        ...it,
        children: it.children ? removeDeep(it.children) : undefined,
      }));
    save({ items: removeDeep(panel.items) });
  }, [panel, save]);

  const updateItem = useCallback((itemId: string, patch: Partial<NavPanelItem>) => {
    const updateDeep = (items: NavPanelItem[]): NavPanelItem[] =>
      items.map((it) =>
        it.id === itemId
          ? { ...it, ...patch }
          : { ...it, children: it.children ? updateDeep(it.children) : undefined }
      );
    save({ items: updateDeep(panel.items) });
  }, [panel, save]);

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-200">Panel de Navegación</p>
          <p className="text-xs text-gray-500 mt-0.5">Menú lateral con acceso rápido a escenas</p>
        </div>
        <button
          onClick={() => save({ enabled: !panel.enabled })}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            panel.enabled
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-800 text-gray-500 border border-gray-700'
          )}
        >
          {panel.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {panel.enabled ? 'Activado' : 'Desactivado'}
        </button>
      </div>

      {panel.enabled && (
        <>
          {/* Panel title */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Título del panel</label>
            <input
              type="text"
              value={panel.title ?? ''}
              onChange={(e) => save({ title: e.target.value || undefined })}
              placeholder={tour.title}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">Elementos</label>
              <button
                onClick={() => addItem()}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>

            {panel.items.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-gray-700 rounded-xl">
                <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Agrega elementos al panel de navegación
              </div>
            ) : (
              <div className="space-y-2">
                {panel.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    depth={0}
                    scenes={tour.scenes}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    onAddChild={addItem}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-600">
            Los elementos con sub-elementos se muestran colapsables. Los íconos son emoji (una sola letra/símbolo).
          </p>
        </>
      )}
    </div>
  );
}
