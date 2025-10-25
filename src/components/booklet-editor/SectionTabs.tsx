import { SectionKey, SECTION_LABELS } from '@/types/sections';
import { Home, User, Palette, Wifi, Wrench, MapPin, FileText, MessageSquare } from 'lucide-react';

interface SectionTabsProps {
  active: SectionKey;
  onChange: (section: SectionKey) => void;
}

const SECTION_ICONS: Record<SectionKey, React.ComponentType<{ className?: string }>> = {
  general: Home,
  identity: User,
  appearance: Palette,
  wifi: Wifi,
  equipments: Wrench,
  nearby: MapPin,
  rules: FileText,
  chatbot: MessageSquare,
};

const SECTIONS: SectionKey[] = [
  'general',
  'identity',
  'appearance',
  'wifi',
  'equipments',
  'nearby',
  'rules',
  'chatbot',
];

export default function SectionTabs({ active, onChange }: SectionTabsProps) {
  return (
    <nav className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2" role="tablist">
      {SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section];
        const isActive = active === section;

        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(section)}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-xl border
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2
              ${
                isActive
                  ? 'bg-[#F7FAFC] border-[#071552] text-[#0F172A] font-medium'
                  : 'border-[#E6EDF2] text-[#64748B] hover:border-[#071552] hover:text-[#0F172A]'
              }
            `}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{SECTION_LABELS[section]}</span>
          </button>
        );
      })}
    </nav>
  );
}
