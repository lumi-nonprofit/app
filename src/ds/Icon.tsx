/* Icon — Lucide outline ikona, jediný schválený způsob renderu ikon v Lumi UI.
   RN verze: lucide-react-native (stejná sada názvů, explicitní importy).
   `currentColor` v RN neexistuje — barvu předává volající explicitně podle
   barvy textu okolního prvku (výchozí colors.textBody). Stroke 1.75 dle DS. */
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
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
  type LucideIcon,
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
} from "lucide-react-native";
import { colors } from "../theme";

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
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  color = colors.textBody,
  style,
}: Props) {
  /* `| undefined` drží původní runtime pojistku pro neznámý název ikony */
  const Glyph: LucideIcon | undefined = ICONS[name];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      {Glyph ? <Glyph size={size} strokeWidth={strokeWidth} color={color} /> : null}
    </View>
  );
}
