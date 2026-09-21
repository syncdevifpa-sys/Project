import { Link, useLocation } from 'react-router-dom';
import { Icon } from './icon';
import { IconButton, Button } from './button';
import { Avatar } from './avatar';
import type { Field } from '@/lib/theme';

export interface NavItem {
  label: string;
  count?: number;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  separator?: false;
}

export type TopNavItem = NavItem | { separator: true };

export interface TopNavProps {
  items?: TopNavItem[];
  user?: { name: string; role: string };
  brand?: { name: string; sub?: string; initials?: string; tone?: Field };
  homeHref?: string;
  onSearch?: () => void;
  settingsHref?: string;
  onSettings?: () => void;
  settingsActive?: boolean;
  onSignOut?: () => void;
  className?: string;
}

function Sup({ n }: { n?: number }) {
  if (n == null) return null;
  return <sup className="ar-sup">({n})</sup>;
}

export function TopNav({
  items,
  user,
  brand = { name: 'Arcádia', sub: 'IFPA CAMPUS BELÉM' },
  homeHref = '/',
  onSearch,
  settingsHref = '/configuracoes',
  onSettings,
  settingsActive,
  onSignOut,
  className,
}: TopNavProps) {
  const location = useLocation();

  const isCurrentActive = (item: NavItem) => {
    if (item.active !== undefined) return item.active;
    if (!item.href) return false;
    if (item.href === '/' || item.href === '/painel') {
      return location.pathname === '/' || location.pathname === '/painel';
    }
    return location.pathname.startsWith(item.href);
  };

  const isSettingsPage = settingsActive !== undefined 
    ? settingsActive 
    : (location.pathname === '/configuracoes' || location.pathname === '/perfil');

  return (
    <header className={['ar-nav', className].filter(Boolean).join(' ')}>
      <Link className="ar-brand" to={homeHref}>
        <Avatar
          name={brand.name}
          initials={brand.initials || brand.name[0]}
          tone={brand.tone || 'lime'}
          size={34}
          decorative={true}
        />
        <span>
          <div className="ar-brand-name">{brand.name}</div>
          {brand.sub && <div className="ar-brand-sub">{brand.sub}</div>}
        </span>
      </Link>

      {items && items.length > 0 && (
        <nav className="ar-navpill" aria-label="Seções do portal">
          {items.map((it, i) => {
            if ('separator' in it && it.separator) {
              return <span key={'sep' + i} className="ar-sep" aria-hidden="true" />;
            }
            const navItem = it as NavItem;
            const active = isCurrentActive(navItem);
            return (
              <Link
                key={navItem.label}
                to={navItem.href || '#'}
                aria-current={active ? 'page' : undefined}
                onClick={navItem.onClick}
              >
                {navItem.label}
                <Sup n={navItem.count} />
              </Link>
            );
          })}
        </nav>
      )}

      <div className="ar-nav-end">
        <IconButton icon="search" label="Buscar (⌘K)" onClick={onSearch} />

        {(onSettings || settingsHref) && (
          <Link
            className={['ar-iconbtn', isSettingsPage ? 'ar-iconbtn--on' : ''].filter(Boolean).join(' ')}
            to={settingsHref}
            onClick={onSettings}
            aria-label="Configurações"
            title="Configurações"
            aria-current={isSettingsPage ? 'page' : undefined}
          >
            <Icon name="settings-2" />
          </Link>
        )}

        {user && (
          <Link className="ar-user" to={settingsHref}>
            <Avatar name={user.name} tone="cyan" size={34} />
            <div>
              <div className="ar-user-name">{user.name}</div>
              <div className="ar-user-role">{user.role}</div>
            </div>
          </Link>
        )}

        {user && (
          <Button variant="primary" size="sm" onClick={onSignOut}>
            Sair
          </Button>
        )}
      </div>
    </header>
  );
}
