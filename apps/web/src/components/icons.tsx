import {
  Activity, Atom, Award, Boxes, Braces, BrainCircuit, Building, ChartScatter, Check, Cloud, CloudCog, Code, Coffee, Container,
  Cpu, Crosshair, Crown, Database, DatabaseZap, FileType, Flame, FlaskConical, Gauge, GitBranch, GitMerge, Hash, Infinity as InfinityIcon,
  Layers, Layout, Map, Network, Play, Puzzle, Rocket, Server, Shield, ShipWheel, Sparkles, Target, Terminal, Trophy, Users, Workflow,
  type LucideIcon,
} from "lucide-react";

// Backend sends icon keys (lucide names). Unknown keys fall back to a code glyph.
const map: Record<string, LucideIcon> = {
  activity: Activity, atom: Atom, award: Award, boxes: Boxes, braces: Braces, "brain-circuit": BrainCircuit, building: Building,
  "chart-scatter": ChartScatter, check: Check, cloud: Cloud, "cloud-cog": CloudCog, code: Code, coffee: Coffee, container: Container,
  cpu: Cpu, crosshair: Crosshair, crown: Crown, database: Database, "database-zap": DatabaseZap, "file-type": FileType, flame: Flame,
  "flask-conical": FlaskConical, gauge: Gauge, "git-branch": GitBranch, "git-merge": GitMerge, hash: Hash, infinity: InfinityIcon,
  layers: Layers, layout: Layout, map: Map, network: Network, play: Play, puzzle: Puzzle, rocket: Rocket, server: Server, shield: Shield,
  "ship-wheel": ShipWheel, sparkles: Sparkles, target: Target, terminal: Terminal, trophy: Trophy, users: Users, workflow: Workflow,
};

export function TopicIcon({ name, className = "h-5 w-5" }: { name?: string | null; className?: string }) {
  const Icon = (name && map[name]) || Code;
  return <Icon className={className} aria-hidden />;
}
