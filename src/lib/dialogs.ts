/* Confirmation dialogs for each platform.
   iOS (HIG Action sheets): the choices of an intentional action are an action sheet, the
   destructive choice at the top, "Cancel" at the bottom. Android (Android guides): a system
   dialog, "Cancel" never the default. Web: window.confirm. Every variant returns
   Promise<boolean>: true when the user confirmed the action.
   The default labels come from the message catalog at call time, in the active language. */
import { ActionSheetIOS, Alert, Platform } from "react-native";
import i18n from "../i18n";

export interface ConfirmOptions {
  /** The title describes the situation ("Discard this entry?"), not "Error". */
  title: string;
  message?: string;
  /** A verb that describes the result ("Discard", "Delete"), never "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** The action destroys data that the person did not choose on purpose: red style. */
  destructive?: boolean;
}

export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  const confirmText = confirmLabel ?? i18n.t("common:actions.ok");
  const cancelText = cancelLabel ?? i18n.t("common:actions.cancel");
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: [confirmText, cancelText],
          destructiveButtonIndex: destructive ? 0 : undefined,
          cancelButtonIndex: 1,
        },
        (index) => resolve(index === 0),
      );
      return;
    }
    if (Platform.OS === "web") {
      const g = globalThis as { confirm?: (text: string) => boolean };
      resolve(
        typeof g.confirm === "function"
          ? g.confirm([title, message].filter(Boolean).join("\n"))
          : false,
      );
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Discard of unsaved work (check-in, questionnaire, crisis plan). */
export function confirmDiscard(opts: ConfirmOptions): Promise<boolean> {
  return confirm({
    destructive: true,
    ...opts,
    confirmLabel: opts.confirmLabel ?? i18n.t("common:actions.discard"),
  });
}

/** Deletion of an item (a custom tag, for example). */
export function confirmDelete(opts: ConfirmOptions): Promise<boolean> {
  return confirm({
    destructive: true,
    ...opts,
    confirmLabel: opts.confirmLabel ?? i18n.t("common:actions.delete"),
  });
}

export interface NotifyOptions {
  title: string;
  message?: string;
  /** The label of the only button; default "OK". */
  dismissLabel?: string;
}

/** A message with one button. Resolves when the person closes it. */
export function notify({ title, message, dismissLabel }: NotifyOptions): Promise<void> {
  const dismissText = dismissLabel ?? i18n.t("common:actions.ok");
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const g = globalThis as { alert?: (text: string) => void };
      if (typeof g.alert === "function") g.alert([title, message].filter(Boolean).join("\n"));
      resolve();
      return;
    }
    Alert.alert(title, message, [{ text: dismissText, onPress: () => resolve() }], {
      cancelable: true,
      onDismiss: () => resolve(),
    });
  });
}
