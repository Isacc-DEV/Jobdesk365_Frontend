import type { ComponentType } from "react";

export type NavigationItem = {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  href?: string;
  active?: boolean;
};

