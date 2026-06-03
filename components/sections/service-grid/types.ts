import type { Content, SectionCopyEntry } from "@/lib/content";

export type ServiceGridProps = {
  services: Content["services"];
  sectionCopy?: SectionCopyEntry;
};
