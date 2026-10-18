/* Icon — platformní symbol (v plánu „Symbol“; jméno Icon zůstává, protože
   `Symbol` by stínilo globální JS konstruktor). iOS: SF Symbols přes expo-symbols
   (váhy, Liquid Glass v lištách), Android: Material Symbols (font přes
   expo-symbols), web: Lucide. Jedna mapa názvů — `IconName` zůstává klíčem
   v modelu (doporučení, aktivity). Výchozí barva = barva textu tématu.
   Ikona je dekorativní (skrytá před čtečkou), pokud nedostane `label`. */
import React from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";
import type { AndroidSymbol, SFSymbol, SymbolWeight } from "expo-symbols";
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

interface Glyph {
  sf: SFSymbol;
  md: AndroidSymbol;
  lucide: LucideIcon;
}

/* HIG SF Symbols: standardní symboly pro standardní akce (xmark, plus, gearshape,
   chevron.backward); Material Symbols: stejné významy v Android idiomu. */
const ICONS = {
  "arrow-left": { sf: "chevron.backward", md: "arrow_back", lucide: ArrowLeft },
  "audio-lines": { sf: "waveform", md: "graphic_eq", lucide: AudioLines },
  "chart-line": { sf: "chart.line.uptrend.xyaxis", md: "show_chart", lucide: ChartLine },
  check: { sf: "checkmark", md: "check", lucide: Check },
  "chevron-right": { sf: "chevron.right", md: "chevron_right", lucide: ChevronRight },
  clock: { sf: "clock", md: "schedule", lucide: Clock },
  close: { sf: "xmark", md: "close", lucide: X },
  cloud: { sf: "cloud", md: "cloud", lucide: Cloud },
  "cloud-rain": { sf: "cloud.rain", md: "rainy", lucide: CloudRain },
  eye: { sf: "eye", md: "visibility", lucide: Eye },
  "flask-conical": { sf: "flask", md: "science", lucide: FlaskConical },
  footprints: { sf: "figure.walk", md: "directions_walk", lucide: Footprints },
  gear: { sf: "gearshape", md: "settings", lucide: Settings },
  heart: { sf: "heart", md: "favorite", lucide: Heart },
  "heart-handshake": { sf: "heart.fill", md: "volunteer_activism", lucide: HeartHandshake },
  "message-circle": { sf: "bubble.left", md: "chat_bubble", lucide: MessageCircle },
  moon: { sf: "moon", md: "bedtime", lucide: Moon },
  "notebook-pen": { sf: "square.and.pencil", md: "edit_note", lucide: NotebookPen },
  phone: { sf: "phone.fill", md: "call", lucide: Phone },
  plus: { sf: "plus", md: "add", lucide: Plus },
  printer: { sf: "printer", md: "print", lucide: Printer },
  shield: { sf: "shield", md: "shield", lucide: Shield },
  smartphone: { sf: "iphone", md: "smartphone", lucide: Smartphone },
  sparkles: { sf: "sparkles", md: "auto_awesome", lucide: Sparkles },
  sun: { sf: "sun.max", md: "light_mode", lucide: Sun },
  "toggle-left": { sf: "lightswitch.off", md: "toggle_off", lucide: ToggleLeft },
  users: { sf: "person.2", md: "group", lucide: Users },
  waves: { sf: "water.waves", md: "waves", lucide: Waves },
  wind: { sf: "wind", md: "air", lucide: Wind },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof ICONS;
export type IconWeight = "regular" | "medium" | "semibold" | "bold";

const SF_WEIGHT: Record<IconWeight, SymbolWeight> = {
  regular: "regular",
  medium: "medium",
  semibold: "semibold",
  bold: "bold",
};
/* Lucide kreslí váhu tloušťkou tahu */
const STROKE: Record<IconWeight, number> = { regular: 1.75, medium: 2, semibold: 2.2, bold: 2.5 };

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** Váha symbolu — má odpovídat váze sousedního textu (HIG SF Symbols). */
  weight?: IconWeight;
  /** Jen Lucide (web): tloušťka tahu; jinak se odvozuje z `weight`. */
  strokeWidth?: number;
  /** Významová ikona: popisek pro čtečku. Bez něj je ikona dekorativní. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Icon({
  name,
  size = 20,
  color,
  weight = "regular",
  strokeWidth,
  label,
  style,
}: Props) {
  const theme = useTheme();
  /* `| undefined` drží původní runtime pojistku pro neznámý název ikony */
  const glyph: Glyph | undefined = ICONS[name];
  const tint = color ?? theme.colors.textBody;
  const a11y = label
    ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel: label }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      };
  let content: React.ReactNode = null;
  if (glyph) {
    const Lucide = glyph.lucide;
    const fallback = (
      <Lucide size={size} strokeWidth={strokeWidth ?? STROKE[weight]} color={tint} />
    );
    content =
      Platform.OS === "ios" || Platform.OS === "android" ? (
        <SymbolView
          name={{ ios: glyph.sf, android: glyph.md }}
          size={size}
          tintColor={tint}
          weight={SF_WEIGHT[weight]}
          type="monochrome"
          fallback={fallback}
        />
      ) : (
        fallback
      );
  }
  return (
    <View {...a11y} style={[{ width: size, height: size }, style]}>
      {content}
    </View>
  );
}
