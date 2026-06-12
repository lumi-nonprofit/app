/* Icon — Lucide outline ikona, jediný schválený způsob renderu ikon v Lumi UI.
   Produkční náhrada CDN fetche z DS: lucide-react (stejná sada, verze 0.469.0),
   explicitní importy kvůli tree-shakingu. Výchozí stroke 1.75 dle DS. */
import {
  ArrowLeft,
  AudioLines,
  ChartLine,
  Check,
  ChevronRight,
  Cloud,
  CloudRain,
  Eye,
  FlaskConical,
  Footprints,
  Heart,
  HeartHandshake,
  MessageCircle,
  Moon,
  NotebookPen,
  Phone,
  Plus,
  Shield,
  Smartphone,
  Sun,
  ToggleLeft,
  Users,
  Waves,
  Wind,
} from "lucide-react";

const ICONS = {
  "arrow-left": ArrowLeft,
  "audio-lines": AudioLines,
  "chart-line": ChartLine,
  check: Check,
  "chevron-right": ChevronRight,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  eye: Eye,
  "flask-conical": FlaskConical,
  footprints: Footprints,
  heart: Heart,
  "heart-handshake": HeartHandshake,
  "message-circle": MessageCircle,
  moon: Moon,
  "notebook-pen": NotebookPen,
  phone: Phone,
  plus: Plus,
  shield: Shield,
  smartphone: Smartphone,
  sun: Sun,
  "toggle-left": ToggleLeft,
  users: Users,
  waves: Waves,
  wind: Wind,
};

export default function Icon({ name, size = 20, strokeWidth = 1.75, style, className }) {
  const Glyph = ICONS[name];
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ display: "inline-flex", width: size, height: size, flex: "none", ...style }}
    >
      {Glyph ? <Glyph size={size} strokeWidth={strokeWidth} /> : null}
    </span>
  );
}
