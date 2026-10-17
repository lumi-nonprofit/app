/* Icon — Lucide outline ikona (přechodně; ve fázi 4 nahrazuje Symbol s SF Symbols
   / Material Symbols). `currentColor` v RN není — barvu předává volající, výchozí
   je barva textu tématu. Ikona je dekorativní: skrytá před čtečkou na obou platformách. */
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import {
  ArrowLeft,
  AudioLines,
  ChartLine,
  Check,
  ChevronRight,
  Clock,
  Cloud,
  CloudRain,
  Eye,
  FlaskConical,
  Footprints,
  Heart,
  HeartHandshake,
  type LucideIcon,
  MessageCircle,
  Moon,
  NotebookPen,
  Phone,
  Plus,
  Printer,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  ToggleLeft,
  Users,
  Waves,
  Wind,
  X,
} from "lucide-react-native";
import { useTheme } from "../theme";

const ICONS = {
  "arrow-left": ArrowLeft,
  "audio-lines": AudioLines,
  "chart-line": ChartLine,
  check: Check,
  "chevron-right": ChevronRight,
  clock: Clock,
  close: X,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  eye: Eye,
  "flask-conical": FlaskConical,
  footprints: Footprints,
  gear: Settings,
  heart: Heart,
  "heart-handshake": HeartHandshake,
  "message-circle": MessageCircle,
  moon: Moon,
  "notebook-pen": NotebookPen,
  phone: Phone,
  plus: Plus,
  printer: Printer,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  sun: Sun,
  "toggle-left": ToggleLeft,
  users: Users,
  waves: Waves,
  wind: Wind,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Icon({ name, size = 20, strokeWidth = 1.75, color, style }: Props) {
  const theme = useTheme();
  /* `| undefined` drží původní runtime pojistku pro neznámý název ikony */
  const Glyph: LucideIcon | undefined = ICONS[name];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      {Glyph ? (
        <Glyph size={size} strokeWidth={strokeWidth} color={color ?? theme.colors.textBody} />
      ) : null}
    </View>
  );
}
