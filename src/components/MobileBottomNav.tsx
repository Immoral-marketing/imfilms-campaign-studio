import { Film, Building2, Users, BarChart, Plus } from "lucide-react";

interface NavItem {
  value: string;
  icon: React.ElementType;
  label: string;
}

// ── Dashboard mode (home) ────────────────────────────────────────────────────
interface DashboardProps {
  mode: "dashboard";
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  showComparative: boolean;
  onNewCampaign: () => void;
}

// ── Tabs mode (campaign detail, etc.) ───────────────────────────────────────
interface TabsProps {
  mode: "tabs";
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: NavItem[];
  onNewCampaign?: () => void;
}

type MobileBottomNavProps = DashboardProps | TabsProps;

const NavBtn = ({
  item,
  activeTab,
  setActiveTab,
}: {
  item: NavItem;
  activeTab: string;
  setActiveTab: (v: string) => void;
}) => {
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

export const MobileBottomNav = (props: MobileBottomNavProps) => {
  const base = "fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0e0e10] border-t border-border/60 h-16 flex items-stretch";

  // ── Tabs mode: items split around optional center + button ──────────────
  if (props.mode === "tabs") {
    const half = Math.floor(props.tabs.length / 2);
    const left = props.tabs.slice(0, half);
    const right = props.tabs.slice(half);
    return (
      <div className={base}>
        <div className="flex flex-1 items-stretch">
          {left.map((item) => (
            <NavBtn key={item.value} item={item} activeTab={props.activeTab} setActiveTab={props.setActiveTab} />
          ))}
        </div>
        <div className="flex items-center justify-center px-2">
          <button
            onClick={props.onNewCampaign}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex flex-1 items-stretch">
          {right.map((item) => (
            <NavBtn key={item.value} item={item} activeTab={props.activeTab} setActiveTab={props.setActiveTab} />
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard mode ───────────────────────────────────────────────────────
  const leftItems: NavItem[] = [{ value: "campaigns", icon: Film, label: "Campañas" }];
  const rightItems: NavItem[] = [];

  if (props.isAdmin) {
    leftItems.push({ value: "distributors", icon: Building2, label: "Distribuidoras" });
    rightItems.push({ value: "partners", icon: Users, label: "Afiliados" });
    if (props.showComparative) {
      rightItems.push({ value: "comparative", icon: BarChart, label: "Métricas" });
    }
  }

  return (
    <div className={base}>
      <div className="flex flex-1 items-stretch">
        {leftItems.map((item) => (
          <NavBtn key={item.value} item={item} activeTab={props.activeTab} setActiveTab={props.setActiveTab} />
        ))}
      </div>
      <div className="flex items-center justify-center px-2">
        <button
          onClick={props.onNewCampaign}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex flex-1 items-stretch justify-end">
        {rightItems.length > 0 ? (
          rightItems.map((item) => (
            <NavBtn key={item.value} item={item} activeTab={props.activeTab} setActiveTab={props.setActiveTab} />
          ))
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
};
