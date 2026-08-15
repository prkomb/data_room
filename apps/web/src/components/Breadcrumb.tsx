import { ChevronRight, FolderLock } from "lucide-react";
import type { BreadcrumbEntry } from "@data-room/shared";

interface BreadcrumbProps {
  crumbs: BreadcrumbEntry[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumb({ crumbs, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <FolderLock className="mr-1 h-4 w-4" />
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.id ?? "root"} className="flex items-center gap-1">
            <button
              className={isLast ? "font-medium text-foreground" : "hover:text-foreground hover:underline"}
              disabled={isLast}
              onClick={() => onNavigate(crumb.id)}
            >
              {crumb.name}
            </button>
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        );
      })}
    </nav>
  );
}
