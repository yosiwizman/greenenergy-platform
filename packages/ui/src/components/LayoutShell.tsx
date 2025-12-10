import React from 'react';
import { clsx } from 'clsx';

export interface LayoutShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}

export function LayoutShell({ children, sidebar, header }: LayoutShellProps) {
  return (
    <div className="flex h-screen flex-col">
      {header && (
        <header className="border-b border-gray-200 bg-white">
          <div className="px-4 py-4">{header}</div>
        </header>
      )}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="w-64 overflow-y-auto border-r border-gray-200 bg-white">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}

export interface NavLinkProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function NavLink({ href, active = false, children, icon }: NavLinkProps) {
  return (
    <a
      href={href}
      className={clsx(
        'flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {icon && <span className="text-gray-500">{icon}</span>}
      {children}
    </a>
  );
}

LayoutShell.NavLink = NavLink;
