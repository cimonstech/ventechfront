import type { ReactNode } from 'react';

export type AdminAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type RowActionItem = {
  label: string;
  onClick?: () => void;
  href?: string;
  target?: string;
  destructive?: boolean;
  hidden?: boolean;
};

export type TableFact = {
  label: string;
  value: ReactNode;
};

export type AttentionItem = {
  id: string;
  message: string;
  onShow: () => void;
  showing?: boolean;
};
