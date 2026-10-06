import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@techrat/theme";

type IconName = keyof typeof Ionicons.glyphMap;

// Backend icon keys are lucide names; map them to the closest Ionicons glyph.
const map: Record<string, IconName> = {
  activity: "pulse-outline", atom: "nuclear-outline", award: "ribbon-outline", boxes: "cube-outline", braces: "code-slash-outline",
  "brain-circuit": "hardware-chip-outline", building: "business-outline", "chart-scatter": "analytics-outline", check: "checkmark-circle-outline",
  cloud: "cloud-outline", "cloud-cog": "cloud-outline", code: "code-slash-outline", coffee: "cafe-outline", container: "cube-outline",
  cpu: "hardware-chip-outline", crosshair: "locate-outline", crown: "trophy-outline", database: "server-outline", "database-zap": "server-outline",
  "file-type": "document-text-outline", flame: "flame-outline", "flask-conical": "flask-outline", gauge: "speedometer-outline",
  "git-branch": "git-branch-outline", "git-merge": "git-merge-outline", hash: "pricetag-outline", infinity: "infinite-outline",
  layers: "layers-outline", layout: "grid-outline", map: "map-outline", network: "git-network-outline", play: "play-outline",
  puzzle: "extension-puzzle-outline", rocket: "rocket-outline", server: "server-outline", shield: "shield-checkmark-outline",
  "bar-chart-3": "bar-chart-outline", bot: "chatbubbles-outline", "git-pull-request": "git-pull-request-outline",
  lock: "lock-closed-outline", sheet: "grid-outline", "shield-alert": "warning-outline", sigma: "calculator-outline", table: "grid-outline",
  "ship-wheel": "boat-outline", sparkles: "sparkles-outline", target: "locate-outline", terminal: "terminal-outline",
  trophy: "trophy-outline", users: "people-outline", workflow: "git-network-outline",
};

export function topicIconName(name?: string | null): IconName {
  return (name && map[name]) || "code-slash-outline";
}

export function TopicIcon({ name, size = 20, color = colors.primary }: { name?: string | null; size?: number; color?: string }) {
  return <Ionicons name={topicIconName(name)} size={size} color={color} />;
}
