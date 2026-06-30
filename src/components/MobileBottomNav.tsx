import { Film, Building2, Users, BarChart, Plus } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  showComparative: boolean;
  onNewCampaign: () => void;
}

interface NavItem {
  value: string;
  icon: React.ElementType;
  label: string;
}

export const MobileBottomNav = ({
  activeTab,
  setActiveTab,
  isAdmin,
  showComparative,
  onNewCampaign,
}: MobileBottomNavProps) => {
  const leftItems: NavItem[] = [{ value: "campaigns", icon: Film, label: "Campañas" }];
  const rightItems: NavItem[] = [];

  if (isAdmin) {
    leftItems.push({ value: "distributors", icon: Building2, label: "Distribuidoras" });
    rightItems.push({ value: "partners", icon: Users, label: "Afiliados" });
    if (showComparative) {
      rightItems.push({ value: "comparative", icon: BarChart, label: "Métricas" });
    }
  }

  const NavBtn = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.value;
    return (
      <button
        onClick={() => setActiveTab(item.value)}
        className={`flex flex-col items-center justify-center flex-1 gap-0.5 py-2 transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] leading-tight">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0e0e10] border-t border-border/60 h-16 flex items-stretch safe-area-bottom">
      {/* Left items */}
      <div className="flex flex-1 items-stretch">
        {leftItems.map((item) => (
          <NavBtn key={item.value} item={item} />
        ))}
      </div>

      {/* Center + button */}
      <div className="flex items-center justify-center px-2">
        <button
          onClick={onNewCampaign}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
      </div>

      {/* Right items */}
      <div className="flex flex-1 items-stretch justify-end">
        {rightItems.length > 0 ? (
          rightItems.map((item) => (
            <NavBtn key={item.value} item={item} />
          ))
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
};
