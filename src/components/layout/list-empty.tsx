import { type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface ListEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function ListEmpty(props: ListEmptyProps) {
  return <EmptyState {...props} />;
}
