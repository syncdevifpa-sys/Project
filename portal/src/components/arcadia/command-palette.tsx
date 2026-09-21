import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchField } from './filter-panel';
import { ChipBar } from './view-toolbar';
import { EmptyState } from './empty-state';
import { Icon, type IconName } from './icon';
import {
  getAvisos,
  getDocumentos,
  getProjetos,
  getPessoas,
} from '@/state/storage';

export interface CommandItem {
  id: string;
  title: string;
  meta?: string;
  description?: string;
  eyebrow?: string;
  icon?: IconName;
  href?: string;
  category?: string;
  active?: boolean;
}

export interface CommandGroup {
  title: string;
  items: CommandItem[];
}

export interface CommandPreview {
  eyebrow?: string;
  title: string;
  meta?: string;
  description?: string;
}

export interface CommandPaletteProps {
  groups?: CommandGroup[];
  preview?: CommandPreview;
  scopes?: string[];
  scope?: string;
  query?: string;
  placeholder?: string;
  hint?: string;
  emptyActions?: React.ReactNode;
  autoFocus?: boolean;
  inline?: boolean;
  onClose?: () => void;
  onSelect?: (item: CommandItem) => void;
}

interface PaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openWithScope: (scope?: string) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  open: false,
  setOpen: () => {},
  openWithScope: () => {},
});

export function useCommandPalette() {
  return useContext(PaletteContext);
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('Tudo');
  const navigate = useNavigate();

  const openWithScope = (s = 'Tudo') => {
    setScope(s);
    setOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, setOpen, openWithScope }}>
      {children}
      {open && (
        <CommandPaletteModal
          initialScope={scope}
          onClose={() => setOpen(false)}
          onSelect={(item) => {
            setOpen(false);
            if (item.href) navigate(item.href);
          }}
        />
      )}
    </PaletteContext.Provider>
  );
}

export function CommandPaletteModal({
  initialScope = 'Tudo',
  onClose,
  onSelect,
}: {
  initialScope?: string;
  onClose?: () => void;
  onSelect?: (item: CommandItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(initialScope);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const rawData = useMemo(() => {
    const avisos = getAvisos().map((a) => ({
      id: 'aviso-' + a.id,
      title: a.titulo,
      meta: `Aviso · ${a.data}`,
      description: a.resumo,
      eyebrow: a.categoria.toUpperCase(),
      icon: 'bell' as IconName,
      href: '/avisos',
      category: 'Avisos',
    }));

    const documentos = getDocumentos().map((d) => ({
      id: 'doc-' + d.id,
      title: d.titulo,
      meta: `Documento · ${d.tipo} · ${d.previsao}`,
      description: `Protocolo ${d.protocolo} · Situação: ${d.situacao}`,
      eyebrow: 'DOCUMENTO',
      icon: 'file-text' as IconName,
      href: '/documentos',
      category: 'Documentos',
    }));

    const projetos = getProjetos().map((p) => ({
      id: 'proj-' + p.id,
      title: p.titulo,
      meta: `Projeto · ${p.autor} · ${p.eixo}`,
      description: `${p.vagas} vagas ofertadas · Situação: ${p.situacao}`,
      eyebrow: 'PROJETO',
      icon: 'folder-kanban' as IconName,
      href: '/projetos',
      category: 'Projetos',
    }));

    const pessoas = getPessoas().map((pe) => ({
      id: 'pessoa-' + pe.id,
      title: pe.nome,
      meta: `${pe.vinculo} · ${pe.cursoOuSetor}`,
      description: pe.email,
      eyebrow: 'PESSOA',
      icon: 'users' as IconName,
      href: '/pessoas',
      category: 'Pessoas',
    }));

    return [...avisos, ...documentos, ...projetos, ...pessoas];
  }, []);

  const filteredItems = useMemo(() => {
    let items = rawData;
    if (scope !== 'Tudo') {
      items = items.filter((it) => it.category?.toLowerCase() === scope.toLowerCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.description && it.description.toLowerCase().includes(q)) ||
          (it.meta && it.meta.toLowerCase().includes(q))
      );
    }
    return items;
  }, [rawData, scope, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filteredItems.forEach((it) => {
      const cat = it.category || 'Outros';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    });
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [filteredItems]);

  const flattened = useMemo(() => {
    return groups.flatMap((g) => g.items);
  }, [groups]);

  const activeItem = flattened[activeIndex] || flattened[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [query, scope]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
      return;
    }
    if (flattened.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flattened.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flattened.length) % flattened.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItem) {
        onSelect?.(activeItem);
      }
    }
  };

  const preview: CommandPreview | undefined = activeItem
    ? {
        eyebrow: activeItem.eyebrow,
        title: activeItem.title,
        meta: activeItem.meta,
        description: activeItem.description,
      }
    : undefined;

  return (
    <div
      className="ar-scrim"
      style={{ alignItems: 'start', paddingTop: 80 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="ar-pal" role="dialog" aria-label="Busca">
        <div className="ar-pal-top">
          <SearchField
            placeholder="Buscar aviso, documento ou projeto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            shortcut="Esc"
            autoFocus
          />
          {!query && (
            <p className="ar-pal-hint">
              Tente &quot;matrícula&quot;, &quot;edital 012&quot; ou o nome de uma pessoa.
            </p>
          )}
          <ChipBar
            items={[
              { label: 'Tudo' },
              { label: 'Avisos' },
              { label: 'Documentos' },
              { label: 'Projetos' },
              { label: 'Pessoas' },
            ]}
            value={scope}
            onChange={setScope}
          />
        </div>

        <div className="ar-pal-body">
          {flattened.length === 0 ? (
            <div className="ar-pal-list">
              <EmptyState
                compact
                icon="search"
                title={`Nada encontrado para "${query}"`}
                description="Confira a grafia ou busque por outra palavra. Avisos antigos ficam em Calendário."
              />
            </div>
          ) : (
            <div className="ar-pal-list" role="listbox">
              {groups.map((g) => (
                <React.Fragment key={g.title}>
                  <div className="ar-pal-group">{g.title}</div>
                  {g.items.map((it) => {
                    const isSelected = activeItem?.id === it.id;
                    return (
                      <div
                        key={it.id}
                        className="ar-pal-item"
                        role="option"
                        tabIndex={0}
                        aria-selected={isSelected ? 'true' : 'false'}
                        onClick={() => onSelect?.(it)}
                        onMouseEnter={() => {
                          const idx = flattened.findIndex((f) => f.id === it.id);
                          if (idx !== -1) setActiveIndex(idx);
                        }}
                      >
                        <Icon name={it.icon || 'bell'} />
                        <div style={{ minWidth: 0 }}>
                          <b>{it.title}</b>
                          {it.meta && <small>{it.meta}</small>}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {preview && (
            <div className="ar-pal-preview">
              {preview.eyebrow && (
                <div className="ar-field-label" style={{ color: 'var(--on-field)' }}>
                  {preview.eyebrow}
                </div>
              )}
              <h4>{preview.title}</h4>
              {preview.meta && <p>{preview.meta}</p>}
              {preview.description && <p>{preview.description}</p>}
              <span className="ar-pal-keys">
                <kbd className="ar-kbd">Enter</kbd> abre
                <kbd className="ar-kbd">↑ ↓</kbd> navega
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
