"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type ListItemProps = {
  leading?: React.ReactNode;
  index?: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightPrimary?: React.ReactNode;
  rightSecondary?: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export function ListItem({ leading, index, title, subtitle, rightPrimary, rightSecondary, onClick, className }: ListItemProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {leading ? (
          <div className="flex-shrink-0">{leading}</div>
        ) : index !== undefined ? (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{index}</span>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          {subtitle ? <div className="text-xs text-muted-foreground truncate">{subtitle}</div> : null}
        </div>
      </div>

      {(rightPrimary || rightSecondary) && (
        <div className="text-right flex-shrink-0 ml-4">
          {rightPrimary ? <div className="font-semibold text-lg">{rightPrimary}</div> : null}
          {rightSecondary ? <div className="text-xs text-muted-foreground">{rightSecondary}</div> : null}
        </div>
      )}
    </div>
  );
}

export default ListItem;
