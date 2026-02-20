'use client';

import React, { useEffect, useState } from 'react';

type ClientRoleGuardProps = {
  allowedRoles: string[];
  children: React.ReactNode;
};

export default function ClientRoleGuard({ allowedRoles, children }: ClientRoleGuardProps) {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('perkasa-finance-auth') || sessionStorage.getItem('perkasa-finance-auth');
      if (!stored) return;
      const session = JSON.parse(stored);
      const role = String(session.role || '').toUpperCase();
      const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
      if (normalizedAllowed.includes(role)) {
        setIsAllowed(true);
      }
    } catch (e) {
      console.error('Failed to parse auth for ClientRoleGuard', e);
    }
  }, [allowedRoles]);

  if (!isAllowed) return null;

  return <>{children}</>;
}

