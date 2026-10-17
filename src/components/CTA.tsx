/* LumiCTA — hlavní akce obrazovky: tlačítko přes celou šířku (lg) s přístupným
   disabled stavem a hintem. Tenký obal nad ds/Button, zůstává kvůli původním
   importům; nové obrazovky používají Button přímo. */
import React from "react";
import Button from "../ds/Button";

interface Props {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  hint?: string;
}

export default function LumiCTA({ children, disabled, onPress, variant = "primary", hint }: Props) {
  return (
    <Button variant={variant} size="lg" fullWidth disabled={disabled} hint={hint} onPress={onPress}>
      {children}
    </Button>
  );
}
