import {
  ArrowUpRight,
  CodeXml,
  Monitor,
  Network,
  Camera,
  Settings2,
} from "lucide-react";

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <ArrowUpRight
      className={className}
      size={20}
      strokeWidth={1.6}
      aria-hidden="true"
    />
  );
}

export function ServiceIcon({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const Icon =
    {
      code: CodeXml,
      monitor: Monitor,
      network: Network,
      camera: Camera,
      settings: Settings2,
    }[name] || Settings2;
  return <Icon size={size} strokeWidth={1.4} aria-hidden="true" />;
}
