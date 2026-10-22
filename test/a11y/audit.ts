/* The accessibility audit of a rendered screen. The audit walks the host tree that
   `screen.toJSON()` returns (RNTL) and reports the violations of the
   rules below. The rules cover the parts of WCAG 2.2 AA that a static tree can show: name, role
   and value (4.1.2), headings (2.4.6) and the target size (2.5.8), with the touch targets of the
   HIG (44 pt) and Material (48 dp). Contrast lives in test/contrast.test.ts, and axe-core checks
   the design system on the web (test/a11y/ds.web.test.tsx). */
import { StyleSheet } from "react-native";
import type { ReactTestRendererJSON } from "react-test-renderer";

export interface Violation {
  rule: string;
  path: string;
  detail: string;
}

export interface AuditReport {
  violations: Violation[];
  /** Pressable elements without an explicit size in the tree; the layout sizes them on a device. */
  unknownTargets: number;
}

export interface AuditOptions {
  /** The minimum touch target in dp or pt: 48 on Android, 44 on iOS. */
  minTouch: number;
  /** A screen must have at least 1 header; a single component does not. Default: true. */
  requireHeader?: boolean;
}

type HostNode = ReactTestRendererJSON;
type Child = HostNode | string;
type Props = Record<string, unknown>;

/** The roles that need an accessible name (WCAG 4.1.2). */
const NAMED_ROLES = new Set([
  "button",
  "link",
  "tab",
  "switch",
  "checkbox",
  "radio",
  "adjustable",
  "slider",
  "togglebutton",
  "menuitem",
  "combobox",
  "spinbutton",
  "searchbox",
  "imagebutton",
]);

/** Host types that size themselves on the device; the target rule does not measure them. */
const NATIVE_SIZED = new Set(["RNCSlider", "RCTSwitch", "AndroidSwitch", "TextInput"]);

const propsOf = (node: HostNode): Props => (node.props ?? {}) as Props;

const roleOf = (node: HostNode): string | undefined => {
  const p = propsOf(node);
  const role = p.accessibilityRole ?? p.role;
  return typeof role === "string" ? role : undefined;
};

/** Hidden subtrees do not reach the screen reader, so the rules skip them. */
const isHidden = (node: HostNode): boolean => {
  const p = propsOf(node);
  return (
    p["aria-hidden"] === true ||
    p.accessibilityElementsHidden === true ||
    p.importantForAccessibility === "no-hide-descendants"
  );
};

/** Pressable and the touchables give the host view a click handler. */
const isPressable = (node: HostNode): boolean => {
  const p = propsOf(node);
  return typeof p.onClick === "function" || typeof p.onPress === "function";
};

function textContent(node: Child): string {
  if (typeof node === "string") return node;
  if (isHidden(node)) return "";
  return (node.children ?? []).map(textContent).join("");
}

function accessibleName(node: HostNode): string {
  const p = propsOf(node);
  for (const key of ["accessibilityLabel", "aria-label"]) {
    const value = p[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return textContent(node).trim();
}

const hasRoleInside = (node: Child): boolean =>
  typeof node !== "string" &&
  (roleOf(node) !== undefined || (node.children ?? []).some(hasRoleInside));

const flatStyle = (node: HostNode): Record<string, unknown> =>
  (StyleSheet.flatten(propsOf(node).style as never) as Record<string, unknown>) ?? {};

const numeric = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const largest = (...values: (number | undefined)[]): number | undefined => {
  const known = values.filter((v): v is number => v !== undefined);
  return known.length ? Math.max(...known) : undefined;
};

interface Slop {
  horizontal: number;
  vertical: number;
}

function slopOf(node: HostNode): Slop {
  const slop = propsOf(node).hitSlop;
  if (typeof slop === "number") return { horizontal: 2 * slop, vertical: 2 * slop };
  if (slop && typeof slop === "object") {
    const s = slop as Record<string, unknown>;
    return {
      horizontal: (numeric(s.left) ?? 0) + (numeric(s.right) ?? 0),
      vertical: (numeric(s.top) ?? 0) + (numeric(s.bottom) ?? 0),
    };
  }
  return { horizontal: 0, vertical: 0 };
}

function describe(node: HostNode): string {
  const role = roleOf(node);
  const name = accessibleName(node);
  const parts = [node.type];
  if (role) parts.push(`role=${role}`);
  if (name) parts.push(`"${name.slice(0, 40)}"`);
  return parts.join(" ");
}

/** Runs the rules over a host tree. `root` is the value of `screen.toJSON()`. */
export function auditTree(root: Child | Child[] | null, options: AuditOptions): AuditReport {
  const violations: Violation[] = [];
  let unknownTargets = 0;
  let headers = 0;
  const requireHeader = options.requireHeader ?? true;

  const report = (rule: string, path: string, detail: string) => {
    violations.push({ rule, path, detail });
  };

  const walk = (node: Child, path: string, hidden: boolean) => {
    if (typeof node === "string") return;
    const here = `${path}/${node.type}`;
    const concealed = hidden || isHidden(node);
    const p = propsOf(node);
    const role = roleOf(node);
    const named = role !== undefined && NAMED_ROLES.has(role);
    const pressable = isPressable(node);

    if (!concealed) {
      if (role === "header") headers += 1;

      /* 1. An element with an interactive role needs an accessible name. */
      if (named && !accessibleName(node)) {
        report("name", here, `${describe(node)} has no accessible name.`);
      }

      /* 2. A pressable element needs a role, or a descendant with a role when it is only a
            container (`accessible={false}`). */
      if (pressable && role === undefined) {
        if (p.accessible === false) {
          if (!(node.children ?? []).some(hasRoleInside)) {
            report(
              "role",
              here,
              `${describe(node)} is a pressable container without a role inside.`,
            );
          }
        } else {
          report("role", here, `${describe(node)} is pressable but has no accessibilityRole.`);
        }
      }

      /* 3. An adjustable element reports its value. */
      if (role === "adjustable" || role === "slider") {
        const value = p.accessibilityValue as Record<string, unknown> | undefined;
        const hasValue =
          (value !== undefined && Object.keys(value).length > 0) ||
          p["aria-valuenow"] !== undefined ||
          p["aria-valuetext"] !== undefined;
        if (!hasValue) report("value", here, `${describe(node)} has no accessibilityValue.`);
      }

      /* 4. A disabled control says so to the screen reader. */
      if (named && p.disabled === true) {
        const state = p.accessibilityState as Record<string, unknown> | undefined;
        if (state?.disabled !== true && p["aria-disabled"] !== true) {
          report("disabled", here, `${describe(node)} is disabled without accessibilityState.`);
        }
      }

      /* 6. Text without content confuses the order of the screen reader. */
      if (node.type === "Text" && !accessibleName(node)) {
        report("empty-text", here, "A Text element has no content.");
      }

      /* 7. Touch targets: 48 dp on Android, 44 pt on iOS (plus hitSlop). The audit measures only
            explicit sizes; the layout decides the rest on a device. */
      if ((named || pressable) && !NATIVE_SIZED.has(node.type) && p.accessible !== false) {
        const style = flatStyle(node);
        const slop = slopOf(node);
        const height = largest(numeric(style.height), numeric(style.minHeight));
        const width = largest(numeric(style.width), numeric(style.minWidth));
        if (height === undefined && width === undefined) {
          unknownTargets += 1;
        } else {
          if (height !== undefined && height + slop.vertical < options.minTouch) {
            report(
              "target-size",
              here,
              `${describe(node)} is ${height + slop.vertical} high; the minimum is ${options.minTouch}.`,
            );
          }
          if (width !== undefined && width + slop.horizontal < options.minTouch) {
            report(
              "target-size",
              here,
              `${describe(node)} is ${width + slop.horizontal} wide; the minimum is ${options.minTouch}.`,
            );
          }
        }
      }

      /* 8. An image that the screen reader reaches needs a label. */
      const image = role === "image" || (node.type === "Image" && p.accessible === true);
      if (image && !accessibleName(node)) {
        report("image", here, `${describe(node)} has no label.`);
      }
    }

    (node.children ?? []).forEach((child, index) => walk(child, `${here}[${index}]`, concealed));
  };

  const roots = root === null ? [] : Array.isArray(root) ? root : [root];
  roots.forEach((node, index) => walk(node, `[${index}]`, false));

  /* 5. Every screen has at least 1 heading (WCAG 2.4.6, HIG navigation bars). */
  if (requireHeader && headers === 0) {
    report("header", "/", "The screen has no element with the header role.");
  }

  return { violations, unknownTargets };
}

/** One line per violation, for the assertion message. */
export const formatViolations = (violations: Violation[]): string[] =>
  violations.map((v) => `${v.rule} | ${v.path} | ${v.detail}`);
