import { sections } from './ToolData';

interface DocsSidebarProps {
  activeSection: string;
  setActiveSection: (id: string) => void;
}

export default function DocsSidebar({
  activeSection,
  setActiveSection,
}: DocsSidebarProps) {
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-24">
        <h3 className="text-sm font-bold text-slate-900 mb-4">CONTENTS</h3>
        <nav className="space-y-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveSection(section.id);
                document
                  .getElementById(section.id)
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
