import * as React from 'react';
import React__default, { HTMLAttributes, ReactElement, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, Ref, CSSProperties, ComponentPropsWithoutRef, AnchorHTMLAttributes, SVGProps } from 'react';
import * as lucide_react from 'lucide-react';
import * as RadixTabs from '@radix-ui/react-tabs';
import * as RadixSelect from '@radix-ui/react-select';
import * as RadixContextMenu from '@radix-ui/react-context-menu';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import * as RadixPopover from '@radix-ui/react-popover';
import { ToasterProps } from 'sonner';
export { toast } from 'sonner';

type Theme = "dark" | "light";
interface ThemeSettings {
    theme: Theme;
    reducedMotion: boolean;
    glass: boolean;
}
declare function useCaelosTheme(): ThemeSettings;
declare function themeAttributes({ theme, reducedMotion, glass, }: ThemeSettings): {
    "data-caelos-theme": Theme;
    "data-caelos-reduced": boolean;
    "data-caelos-glass": boolean;
};
interface CaelosProviderProps extends HTMLAttributes<HTMLDivElement> {
    theme?: Theme;
    reducedMotion?: boolean;
    glass?: boolean;
    tooltipDelay?: number;
}
/** Scope tokens to this subtree. Portaled components retain these settings. */
declare function CaelosProvider({ theme, reducedMotion, glass, tooltipDelay, children, ...props }: CaelosProviderProps): React__default.JSX.Element;

type Tone = "neutral" | "ready" | "progress" | "done" | "sage" | "danger" | "atmospheric" | "structural";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "tonal" | "text";
    size?: "sm" | "md";
    danger?: boolean;
    loading?: boolean;
    leadingIcon?: ReactNode;
    forcedState?: "rest" | "hover" | "active" | "focus";
}
declare const Button: React__default.ForwardRefExoticComponent<ButtonProps & React__default.RefAttributes<HTMLButtonElement>>;
interface IconButtonProps extends Omit<ButtonProps, "children" | "leadingIcon"> {
    label: string;
    icon: ReactNode;
    tooltip?: boolean;
}
declare const IconButton: React__default.ForwardRefExoticComponent<IconButtonProps & React__default.RefAttributes<HTMLButtonElement>>;
interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "flat" | "lifted" | "glass";
    interactive?: boolean;
}
declare const Card: React__default.ForwardRefExoticComponent<CardProps & React__default.RefAttributes<HTMLDivElement>>;
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    variant?: "text" | "search";
    leadingIcon?: ReactNode;
    label?: ReactNode;
    description?: ReactNode;
    invalid?: boolean;
    onClear?: () => void;
    forcedState?: "rest" | "focus";
    wrapperClassName?: string;
}
declare const Input: React__default.ForwardRefExoticComponent<InputProps & React__default.RefAttributes<HTMLInputElement>>;
interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: ReactNode;
    description?: ReactNode;
    invalid?: boolean;
    wrapperClassName?: string;
    forcedState?: "rest" | "focus";
}
declare const TextArea: React__default.ForwardRefExoticComponent<TextAreaProps & React__default.RefAttributes<HTMLTextAreaElement>>;
interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "filter" | "status" | "category" | "count";
    tone?: Tone;
    selected?: boolean;
    leadingIcon?: ReactNode;
}
declare const Chip: React__default.ForwardRefExoticComponent<ChipProps & React__default.RefAttributes<HTMLButtonElement>>;
declare function Badge({ variant, children, tone, className, ...props }: HTMLAttributes<HTMLSpanElement> & {
    tone?: Tone;
    variant?: "status" | "dot";
}): React__default.JSX.Element;
interface RowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "sidebar" | "list" | "tab" | "crumb";
    size?: "sm" | "md";
    selected?: boolean;
    leadingIcon?: ReactNode;
    trailing?: ReactNode;
    forcedState?: string;
}
declare const Row: React__default.ForwardRefExoticComponent<RowProps & React__default.RefAttributes<HTMLButtonElement>>;
declare function RowGroup({ children, style, ...props }: HTMLAttributes<HTMLDivElement>): React__default.JSX.Element;
interface TooltipProps {
    variant?: "default" | "path";
    label: ReactNode;
    detail?: ReactNode;
    children: ReactElement;
    side?: "top" | "bottom" | "left" | "right";
    sideOffset?: number;
    disabled?: boolean;
    open?: boolean;
}
declare function Tooltip({ variant, label, detail, children, side, sideOffset, disabled, open, }: TooltipProps): React__default.JSX.Element;
declare const PermissionsIcon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
interface MenuOption {
    value: string;
    label: ReactNode;
    disabled?: boolean;
    tone?: Tone;
}
interface SelectMenuProps {
    trigger: ReactElement<Pick<HTMLAttributes<HTMLElement>, "onPointerDown" | "onClick">>;
    label?: string;
    options: MenuOption[];
    value: string;
    onValueChange: (value: string) => void;
    side?: "top" | "bottom";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    disabled?: boolean;
}
declare function SelectMenu({ trigger, label, options, value, onValueChange, side, align, sideOffset, disabled, }: SelectMenuProps): React__default.JSX.Element;
interface ActionMenuProps {
    trigger: ReactElement;
    label?: string;
    items: {
        id: string;
        label: ReactNode;
        disabled?: boolean;
        onSelect: () => void;
    }[];
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
}
declare function ActionMenu({ trigger, label, items, side, align, }: ActionMenuProps): React__default.JSX.Element;
declare const STATUS_OPTIONS: MenuOption[];
declare function StatusSelect({ value, onValueChange, options, disabled, }: Omit<SelectMenuProps, "trigger" | "options"> & {
    options?: MenuOption[];
}): React__default.JSX.Element;
interface SelectProps extends Omit<React__default.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>, "value" | "defaultValue" | "children"> {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    options: MenuOption[];
    placeholder?: string;
    label?: string;
    showLabel?: boolean;
    variant?: "compact" | "field";
    wrapperClassName?: string;
    disabled?: boolean;
    name?: string;
    required?: boolean;
    className?: string;
    style?: React__default.CSSProperties;
}
declare const Select: React__default.ForwardRefExoticComponent<SelectProps & React__default.RefAttributes<HTMLButtonElement>>;
interface ScrollAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
    dir?: "ltr" | "rtl";
    viewportLabel: string;
    viewportRef?: React__default.Ref<HTMLDivElement>;
}
declare const ScrollArea: React__default.ForwardRefExoticComponent<ScrollAreaProps & React__default.RefAttributes<HTMLDivElement>>;
declare const TabsRoot: React__default.ForwardRefExoticComponent<RadixTabs.TabsProps & React__default.RefAttributes<HTMLDivElement>>;
declare const TabsList: React__default.ForwardRefExoticComponent<Omit<RadixTabs.TabsListProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & {
    enclosed?: boolean;
    appearance?: "pill" | "underline";
} & React__default.RefAttributes<HTMLDivElement>>;
declare const TabsTrigger: React__default.ForwardRefExoticComponent<Omit<RadixTabs.TabsTriggerProps & React__default.RefAttributes<HTMLButtonElement>, "ref"> & {
    appearance?: "tab" | "tonal" | "underline";
} & React__default.RefAttributes<HTMLButtonElement>>;
declare const TabsContent: React__default.ForwardRefExoticComponent<Omit<RadixTabs.TabsContentProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    label: string;
    items: {
        value: string;
        label: ReactNode;
        content: ReactNode;
        disabled?: boolean;
    }[];
    enclosed?: boolean;
}
declare function Tabs({ value, onValueChange, label, items, enclosed }: TabsProps): React__default.JSX.Element;
interface TaskRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title: string;
    status: string;
    onStatusChange?: (value: string) => void;
    /** Render the status control greyed out (present but not yet interactive). */
    statusDisabled?: boolean;
    owner?: {
        name: string;
        avatar?: ReactNode;
        color?: string;
    };
    ownerDisplay?: "avatar" | "name";
    onOpen?: () => void;
    options?: MenuOption[];
    leading?: ReactNode;
    afterTitle?: ReactNode;
    metadata?: ReactNode;
    actions?: ReactNode;
    trailing?: ReactNode;
}
declare const TaskRow: React__default.ForwardRefExoticComponent<TaskRowProps & React__default.RefAttributes<HTMLDivElement>>;
declare function Breadcrumb({ children, fullPath, ...props }: HTMLAttributes<HTMLElement> & {
    fullPath?: string;
}): React__default.JSX.Element;
declare function BreadcrumbItem({ current, children, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    current?: boolean;
}): React__default.JSX.Element;
declare function BreadcrumbSeparator(): React__default.JSX.Element;
/** Identity colours, one `--avatar-*` token each: Claude Code's eight subagent colours plus amber, gold and silver. */
declare const avatarColors: readonly ["red", "orange", "amber", "gold", "yellow", "green", "cyan", "blue", "purple", "pink", "silver"];
type AvatarColor = (typeof avatarColors)[number];
interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
    name: string;
    src?: string;
    size?: "sm" | "md" | "lg" | "xl" | "xxl";
    /** Circle for people, square for agents. */
    shape?: "circle" | "square";
    /** Shorthand for shape when `shape` is not given: person → circle, agent → square. */
    kind?: "person" | "agent";
    /** The user's identity colour; it fills the avatar. Unset reads as green. */
    color?: AvatarColor;
    /** AvatarBadge: attention (permission, action or attention needed) or running (a background process or subagent). */
    status?: "attention" | "running";
}
/** Identity image with initials when an image is missing or cannot load, and an optional status badge. */
declare const Avatar: React__default.ForwardRefExoticComponent<AvatarProps & React__default.RefAttributes<HTMLSpanElement>>;
interface PersonChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    name: string;
    src?: string;
    kind?: "person" | "agent";
    onRemove?: () => void;
}
declare function PersonChip({ name, src, kind, onRemove, className, ...props }: PersonChipProps): React__default.JSX.Element;
interface UserCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    name: string;
    src?: string;
    kind?: "person" | "agent";
    description?: ReactNode;
    actions?: ReactNode;
}
/** Shared identity surface; the application owns profile data and actions. */
declare function UserCard({ name, src, kind, description, actions, className, ...props }: UserCardProps): React__default.JSX.Element;
interface DisclosureProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title: ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    headingLevel?: 2 | 3 | 4;
}
/** Intrinsic-height expansion preserves child state and keeps closed content inert. */
declare function Disclosure({ title, children, defaultOpen, open, onOpenChange, headingLevel, className, ...props }: DisclosureProps): React__default.JSX.Element;

/** Application-provided installed command or skill. Selection inserts text; it never executes. */
interface ComposerCommand {
    id: string;
    /** Display name, with or without a leading slash. Must be unique in the supplied list. */
    name: string;
    description: string;
    kind: "command" | "skill";
    /** Defaults to /name. Allows the host to use a different skill invocation syntax. */
    invocation?: string;
}
/** Application-provided participant in the current chat. Selecting only inserts a tag. */
interface ComposerAgent {
    id: string;
    /** Optional avatar image; falls back to the shared agent initials avatar. */
    avatarSrc?: string;
    name: string;
    description?: string;
    /** Defaults to @name. Supply a unique handle when display names contain spaces or collide. */
    mention?: string;
}

type ReplyFormat = "text" | "voice" | "both";
type ComposerAddition = "File or folder" | "Agent" | "Goal" | "Session instruction";
interface ComposerMessage {
    text: string;
    replyFormat: ReplyFormat;
    model: string;
    reasoning: string;
    goal?: string;
    instruction?: string;
}
interface ComposerProps {
    /** Gallery-only proposal. Omit to preserve the approved production behavior. */
    experimentalAgentSettings?: {
        permissions: string[];
        values: Record<string, {
            model: string;
            reasoning: string;
            permission: string;
            replyFormat: ReplyFormat;
        }>;
        onChange: (agentId: string, field: "model" | "reasoning" | "permission" | "replyFormat", value: string) => void;
    };
    /** Host integrations can stop a response and submit attachments without text. */
    sending?: boolean;
    onStop?: () => void;
    allowEmptySubmit?: boolean;
    sendDisabled?: boolean;
    showReplyFormat?: boolean;
    additions?: ComposerAddition[];
    additionLabels?: Partial<Record<ComposerAddition, string>>;
    textareaRef?: Ref<HTMLTextAreaElement>;
    textareaTestId?: string;
    value: string;
    onValueChange: (value: string) => void;
    onSend: (message: ComposerMessage) => void;
    model: string;
    models: string[];
    onModelChange: (model: string) => void;
    reasoning: string;
    reasoningLevels: string[];
    onReasoningChange: (reasoning: string) => void;
    replyFormat: ReplyFormat;
    onReplyFormatChange: (format: ReplyFormat) => void;
    live?: boolean;
    onLiveChange?: (live: boolean) => void;
    onDictate?: () => void;
    onAdd?: (kind: ComposerAddition) => void;
    /** Installed commands and skills. Omit to disable suggestions; [] shows an empty registry. */
    commands?: ComposerCommand[];
    /** Only the agents participating in this chat. Omit to disable @ suggestions. */
    agents?: ComposerAgent[];
    /** Agent whose model/reasoning the controlled props currently describe. */
    activeAgentId?: string;
    onActiveAgentChange?: (agentId: string) => void;
    disabled?: boolean;
    placeholder?: string;
    label?: string;
    /** Saved conversation context. Supply a change handler to enable its editor. */
    goal?: string;
    onGoalChange?: (goal: string) => void;
    instruction?: string;
    onInstructionChange?: (instruction: string) => void;
    /** Used consistently in the add menu and saved goal pill. Defaults to Lucide Goal. */
    goalIcon?: ReactElement;
    context?: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
}
/** Controlled composer. The application owns sending, draft clearing, audio, and context. */
declare function Composer(props: ComposerProps): React.JSX.Element;
interface PermissionControlProps {
    /** Dock beside a containing data-composer-menu-surface when set to right. */
    menuSide?: "top" | "right";
    showLabel?: boolean;
    menuOwner?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
}
/** Use in the conversation header, or a launch composer's header slot. */
declare function PermissionControl(props: PermissionControlProps): React.JSX.Element;
/** Reuses the maintained composer selector for per-agent model/reasoning settings. */
interface ComposerChoiceProps {
    label: string;
    value: string;
    options: string[];
    onValueChange: (value: string) => void;
    menuOwner?: string;
}
declare function ComposerChoice(props: ComposerChoiceProps): React.JSX.Element;

declare const approvedTokens: {
    readonly "--sys-accent": "#678BEC";
    readonly "--sys-accent-glow": "rgba(103, 139, 236, 0.28)";
    readonly "--sys-accent-hot": "#C75F66";
    readonly "--sys-accent-hover": "#779CFF";
    readonly "--sys-accent-line": "rgba(103, 139, 236, 0.22)";
    readonly "--sys-accent-on-tint": "rgba(169, 192, 249, 0.9)";
    readonly "--sys-accent-tint": "rgba(103, 139, 236, 0.1)";
    readonly "--sys-border-1": "var(--sys-hair-1)";
    readonly "--sys-border-2": "var(--sys-hair-2)";
    readonly "--sys-border-3": "var(--sys-hair-3)";
    readonly "--sys-chrome": "#080817";
    readonly "--sys-control-circle-size": "34px";
    readonly "--sys-conversation-readonly-max": "780px";
    readonly "--sys-ease-out": "cubic-bezier(0.16, 1, 0.3, 1)";
    readonly "--sys-ease-snap": "cubic-bezier(0.2, 0.85, 0.25, 1)";
    readonly "--sys-editor-min-height": "300px";
    readonly "--sys-elev-0": "0 0 0 rgba(0, 0, 0, 0)";
    readonly "--sys-elev-1": "0 2.5px 12px rgba(0, 0, 0, 0.144), 0 1.05px 4.5px rgba(0, 0, 0, 0.163)";
    readonly "--sys-elev-2": "0 6.37px 30.59px rgba(0, 0, 0, 0.166), 0 2.68px 11.47px rgba(0, 0, 0, 0.187)";
    readonly "--sys-elev-3": "0 11.02px 52.88px rgba(0, 0, 0, 0.187), 0 4.63px 19.83px rgba(0, 0, 0, 0.211)";
    readonly "--sys-elevated": "#161627";
    readonly "--sys-elevated-2": "#1E1E30";
    readonly "--sys-ground": "#100F1C";
    readonly "--sys-hair-1": "rgba(255, 255, 255, 0.045)";
    readonly "--sys-hair-2": "rgba(255, 255, 255, 0.090)";
    readonly "--sys-hair-3": "rgba(255, 255, 255, 0.140)";
    readonly "--sys-message-part-max": "450px";
    readonly "--sys-motion-base": "240ms";
    readonly "--sys-motion-fast": "132ms";
    readonly "--sys-motion-slow": "360ms";
    readonly "--sys-radius-full": "999px";
    readonly "--sys-radius-lg": "13.5px";
    readonly "--sys-radius-md": "10px";
    readonly "--sys-radius-sm": "7.41px";
    readonly "--sys-radius-xl": "18.23px";
    readonly "--sys-sem-atmospheric": "#8879A0";
    readonly "--sys-sem-danger": "#C25B62";
    readonly "--sys-sem-danger-glow": "rgba(194, 91, 98, 0.28)";
    readonly "--sys-sem-danger-hover": "#D56C72";
    readonly "--sys-sem-danger-line": "rgba(194, 91, 98, 0.26)";
    readonly "--sys-sem-danger-on-tint": "rgba(230, 166, 167, 0.9)";
    readonly "--sys-sem-danger-tint": "rgba(194, 91, 98, 0.14)";
    readonly "--sys-sem-done": "#5B7D73";
    readonly "--sys-sem-done-on-tint": "rgba(158, 188, 178, 0.9)";
    readonly "--sys-sem-neutral": "#8F8A80";
    readonly "--sys-sem-progress": "#E8B87A";
    readonly "--sys-sem-progress-glow": "rgba(232, 184, 122, 0.28)";
    readonly "--sys-sem-progress-hover": "#FACA8B";
    readonly "--sys-sem-progress-line": "rgba(232, 184, 122, 0.26)";
    readonly "--sys-sem-progress-on-tint": "rgba(241, 211, 173, 0.9)";
    readonly "--sys-sem-progress-tint": "rgba(232, 184, 122, 0.14)";
    readonly "--sys-sem-ready": "#8E96CC";
    readonly "--sys-sem-ready-glow": "rgba(142, 150, 204, 0.28)";
    readonly "--sys-sem-ready-line": "rgba(142, 150, 204, 0.26)";
    readonly "--sys-sem-ready-on-tint": "rgba(189, 195, 233, 0.9)";
    readonly "--sys-sem-ready-tint": "rgba(142, 150, 204, 0.14)";
    readonly "--sys-sem-sage": "#7A9E93";
    readonly "--sys-sem-sage-glow": "rgba(122, 158, 147, 0.28)";
    readonly "--sys-sem-sage-line": "rgba(122, 158, 147, 0.26)";
    readonly "--sys-sem-sage-on-tint": "rgba(173, 203, 194, 0.9)";
    readonly "--sys-sem-sage-tint": "rgba(122, 158, 147, 0.14)";
    readonly "--sys-sem-structural": "#4E4C82";
    readonly "--sys-sidebar-control-size": "44px";
    readonly "--sys-sidebar-icon-size": "20px";
    readonly "--sys-sidebar-label-size": "13px";
    readonly "--sys-sidebar-rail-width": "calc(var(--sys-sidebar-control-size) + var(--sys-space-4) * 2)";
    readonly "--sys-space-1": "3px";
    readonly "--sys-space-2": "6px";
    readonly "--sys-space-3": "9px";
    readonly "--sys-space-4": "12px";
    readonly "--sys-space-5": "15px";
    readonly "--sys-space-6": "18px";
    readonly "--sys-space-7": "24px";
    readonly "--sys-space-8": "30px";
    readonly "--sys-text-faint": "#53546E";
    readonly "--sys-text-primary": "#EDE3CF";
    readonly "--sys-text-secondary": "#9B958B";
    readonly "--sys-text-tertiary": "#717184";
    readonly "--sys-top": "#262639";
    readonly "--sys-type-body": "14px";
    readonly "--sys-type-caption": "12px";
    readonly "--sys-workspace-content-max": "1024px";
};

declare const actions: {
    readonly edit: {
        readonly label: "Edit";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly rename: {
        readonly label: "Rename";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly open: {
        readonly label: "Open";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly viewEdit: {
        readonly label: "View / Edit";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly addTask: {
        readonly label: "Add Task";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly addSubtask: {
        readonly label: "Add Subtask";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly cycle: {
        readonly label: "Add to Cycle…";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly promote: {
        readonly label: "Promote to Module";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly duplicate: {
        readonly label: "Duplicate";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly move: {
        readonly label: "Move…";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly archive: {
        readonly label: "Archive";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
        readonly destructive: true;
    };
    readonly delete: {
        readonly label: "Delete";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
        readonly destructive: true;
    };
    readonly file: {
        readonly label: "File viewer";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly external: {
        readonly label: "External app";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly copyPath: {
        readonly label: "Copy pathname";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
    readonly moveFile: {
        readonly label: "Move file";
        readonly icon: React__default.ForwardRefExoticComponent<Omit<lucide_react.LucideProps, "ref"> & React__default.RefAttributes<SVGSVGElement>>;
    };
};
type ContextMenuAction = keyof typeof actions;
/** Approved live Task Graph inventory, plus the chat and working-file menus. */
declare const contextMenuVariants: {
    readonly chat: readonly [readonly ["rename"], readonly ["delete"]];
    readonly project: readonly [readonly ["edit", "duplicate"], readonly ["archive"]];
    readonly initiative: readonly [readonly ["edit"], readonly ["archive"]];
    readonly module: readonly [readonly ["open", "addTask", "cycle"], readonly ["archive"]];
    readonly task: readonly [readonly ["viewEdit", "addSubtask", "cycle"], readonly ["promote", "duplicate"], readonly ["move", "archive"]];
    readonly cycle: readonly [readonly ["edit", "duplicate"], readonly ["archive"]];
    readonly file: readonly [readonly ["file", "external"], readonly ["copyPath", "moveFile"]];
};
type ContextMenuTarget = keyof typeof contextMenuVariants;
type ContextMenuActionState = {
    onSelect?: () => void;
    disabled?: boolean;
    /** Exposed to assistive technology and the native hover hint. */
    unavailableReason?: string;
};
type TargetContextMenuProps<T extends ContextMenuTarget = ContextMenuTarget> = {
    target: T;
    label: string;
    children: ReactElement;
    actions?: Partial<Record<(typeof contextMenuVariants)[T][number][number], ContextMenuActionState>>;
    /** The original Task Graph omits Move for tasks scoped to a module. */
    allowMove?: boolean;
    onCloseAutoFocus?: React__default.ComponentProps<typeof ContextMenuContent>["onCloseAutoFocus"];
};
/** Missing handlers stay visible and disabled. Mutations/confirmation belong to the host. */
declare function TargetContextMenu<T extends ContextMenuTarget>({ target, label, children, actions: states, allowMove, onCloseAutoFocus }: TargetContextMenuProps<T>): React__default.JSX.Element;

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
    style?: React__default.CSSProperties;
    bodyLabel?: string;
    closeLabel?: string;
    initialFocusRef?: React__default.RefObject<HTMLElement>;
    returnFocusRef?: React__default.RefObject<HTMLElement>;
}
/** Controlled modal. The caller retains drafts and owns accepted mutations. */
declare function Dialog(props: DialogProps): React__default.JSX.Element;
/** The same dialog contract, anchored to the right edge. Width/offset are layout props. */
declare function Drawer(props: DialogProps): React__default.JSX.Element;
declare const ContextMenu: React__default.FC<RadixContextMenu.ContextMenuProps>;
declare const ContextMenuTrigger: React__default.ForwardRefExoticComponent<Omit<RadixContextMenu.ContextMenuTriggerProps & React__default.RefAttributes<HTMLSpanElement>, "ref"> & React__default.RefAttributes<HTMLSpanElement>>;
declare const ContextMenuContent: React__default.ForwardRefExoticComponent<Omit<RadixContextMenu.ContextMenuContentProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & {
    target?: ContextMenuTarget;
} & React__default.RefAttributes<HTMLDivElement>>;
declare const ContextMenuItem: React__default.ForwardRefExoticComponent<Omit<RadixContextMenu.ContextMenuItemProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & {
    destructive?: boolean;
} & React__default.RefAttributes<HTMLDivElement>>;
declare function ContextMenuSeparator(props: React__default.ComponentPropsWithoutRef<typeof RadixContextMenu.Separator>): React__default.JSX.Element;
declare const ActionMenuRoot: React__default.FC<Dropdown.DropdownMenuProps>;
declare const ActionMenuTrigger: React__default.ForwardRefExoticComponent<Dropdown.DropdownMenuTriggerProps & React__default.RefAttributes<HTMLButtonElement>>;
declare const ActionMenuContent: React__default.ForwardRefExoticComponent<Omit<Dropdown.DropdownMenuContentProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
declare const ActionMenuItem: React__default.ForwardRefExoticComponent<Omit<Dropdown.DropdownMenuItemProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
/** Checkbox semantics and a stable indicator column within the shared compact menu. */
declare const ActionMenuCheckboxItem: React__default.ForwardRefExoticComponent<Omit<Dropdown.DropdownMenuCheckboxItemProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
declare function ActionMenuSeparator(props: React__default.ComponentPropsWithoutRef<typeof Dropdown.Separator>): React__default.JSX.Element;

declare const Popover: React__default.FC<RadixPopover.PopoverProps>;
declare const PopoverTrigger: React__default.ForwardRefExoticComponent<RadixPopover.PopoverTriggerProps & React__default.RefAttributes<HTMLButtonElement>>;
declare const PopoverClose: React__default.ForwardRefExoticComponent<RadixPopover.PopoverCloseProps & React__default.RefAttributes<HTMLButtonElement>>;
declare const PopoverContent: React__default.ForwardRefExoticComponent<Omit<RadixPopover.PopoverContentProps & React__default.RefAttributes<HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
declare const Range: React__default.ForwardRefExoticComponent<Omit<React__default.InputHTMLAttributes<HTMLInputElement>, "type"> & React__default.RefAttributes<HTMLInputElement>>;
declare const Checkbox: React__default.ForwardRefExoticComponent<Omit<React__default.InputHTMLAttributes<HTMLInputElement>, "type"> & React__default.RefAttributes<HTMLInputElement>>;
type TextTone = "default" | "muted" | "dim" | "accent";
declare const Heading: React__default.ForwardRefExoticComponent<React__default.HTMLAttributes<HTMLHeadingElement> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    size?: "display" | "page" | "section" | "title";
    tone?: TextTone;
} & React__default.RefAttributes<HTMLHeadingElement>>;
declare const Text: React__default.ForwardRefExoticComponent<React__default.HTMLAttributes<HTMLElement> & {
    as?: "span" | "p" | "div";
    variant?: "body" | "small" | "label" | "mono";
    tone?: TextTone;
} & React__default.RefAttributes<HTMLElement>>;
declare function Separator({ orientation, decorative, className, ...props }: HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
    decorative?: boolean;
}): React__default.JSX.Element;
/** Native determinate progress. Clamp invalid values instead of silently becoming indeterminate. */
declare function Progress({ value, max, label, className, ...props }: Omit<React__default.ProgressHTMLAttributes<HTMLProgressElement>, "value" | "max" | "children"> & {
    value: number;
    max?: number;
    label: string;
}): React__default.JSX.Element;
/** Quiet status; the product owns pending state. Deliberately no custom animation. */
declare function Loading({ children, ...props }: HTMLAttributes<HTMLElement>): React__default.JSX.Element;
declare const LinkButton: React__default.ForwardRefExoticComponent<React__default.AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: "primary" | "tonal" | "text";
    size?: "sm" | "md";
    danger?: boolean;
} & React__default.RefAttributes<HTMLAnchorElement>>;
declare function Toaster({ toastOptions, icons, ...props }: ToasterProps): React__default.JSX.Element;
declare const Surface: React__default.ForwardRefExoticComponent<React__default.HTMLAttributes<HTMLElement> & {
    as?: "div" | "main" | "aside" | "section";
    layer?: "ground" | "chrome" | "elevated" | "elevated-2" | "top";
    texture?: "auto" | "plain" | "graph" | "glass";
} & React__default.RefAttributes<HTMLElement>>;
interface ResizeHandleProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
    value: number;
    min: number;
    max: number;
    step?: number;
    side?: "left" | "right";
    label: string;
    onValueChange: (value: number) => void;
}
/** Vertical separator; side identifies the pane being resized. Pointer capture cleans up on cancellation/unmount. */
declare function ResizeHandle({ value, min, max, step, side, label, onValueChange, className, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onKeyDown, ...props }: ResizeHandleProps): React__default.JSX.Element;

interface NovaLoaderProps {
    size?: number;
    label?: string;
    paused?: boolean;
    className?: string;
    style?: CSSProperties;
}
/** The approved v6 geometry, with React lifecycle cleanup and theme motion settings. */
declare function NovaLoader({ size, label, paused, className, style }: NovaLoaderProps): React.JSX.Element;

interface RippleLoaderProps {
    /** Edge length in px. 12 sits beside small text; 16 suits a status corner. */
    size?: number;
    /** Gap between cells in px. Defaults to 1 up to 16px, then scales with size. */
    gap?: number;
    /** Accessible status text. */
    label?: string;
    /** Hold the still diagonal instead of animating. */
    paused?: boolean;
    className?: string;
    style?: CSSProperties;
}
/** Small inline activity mark. Inherits the surrounding text colour; respects theme reduced motion. */
declare function RippleLoader({ size, gap, label, paused, className, style }: RippleLoaderProps): React.JSX.Element;

interface AgentIdentity {
    id: string;
    name: string;
    avatarSrc?: string;
    /** Identity colour; fills the agent's avatar wherever it appears. */
    color?: AvatarColor;
}
/** One circular identity token for conversation headers, rosters, mentions and messages. */
declare function AgentAvatar({ agent, size, ...props }: Omit<AvatarProps, "name" | "src" | "kind" | "shape"> & {
    agent: AgentIdentity;
}): React.JSX.Element;
interface AgentMessageProps extends HTMLAttributes<HTMLElement> {
    agent: AgentIdentity;
    continued?: boolean;
    responding?: boolean;
}
/** Open conversation layout. The host supplies identity and activity per message. */
declare function AgentMessage({ agent, continued, responding, children, className, ...props }: AgentMessageProps): React.JSX.Element;

/** Width and content length never silently change density. */
type Density = "compact" | "default" | "comfortable";
/** Optional subtree override. Omit this provider to use approved Default spacing. */
declare const SpacingDensity: React__default.Provider<Density>;
type SpacingLayoutProps = ComponentPropsWithoutRef<"div">;
/** Small generic group. Prefer the named relationship when one applies. */
declare const Stack: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
/** Complete fields including labels/help/errors; layout only, not a fieldset. */
declare const FieldGroup: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
declare const SectionStack: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
declare const InlineCluster: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
declare const ActionRow: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
/** Content-driven columns; can shrink below 240px in narrow panes. */
declare const ResponsiveGrid: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
/** Apply once at the surface edge; avoid stacking with existing surface padding. */
declare const Inset: React__default.ForwardRefExoticComponent<Omit<React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React__default.RefAttributes<HTMLDivElement>>;
interface SectionProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
    title: ReactNode;
    description?: ReactNode;
    level?: 2 | 3 | 4;
}
/** Operational signpost: Plex/inherited UI type, with one owner for intro spacing. */
declare const Section: React__default.ForwardRefExoticComponent<SectionProps & React__default.RefAttributes<HTMLElement>>;

type MessageSpeaker = "sage" | "ready";
type MessageArrival = "phrase" | "paragraph" | "none";
interface ConversationColumnProps extends HTMLAttributes<HTMLDivElement> {
}
/** The conversation's own column: one owner for the 24px between turns. */
declare function ConversationColumn({ className, ...props }: ConversationColumnProps): React.JSX.Element;
interface ConversationMessageProps extends HTMLAttributes<HTMLElement> {
    /** Quiet inline name. Omitted on a continuation, exactly as the approved specimen does. */
    agentName?: ReactNode;
    /** Avatar identity; keep it on continuations to preserve the text column. */
    agent?: AgentIdentity;
    /** Hide the repeated avatar while keeping subsequent prose aligned. */
    continued?: boolean;
    /** Group renderers show the avatar only beside the latest visible message or activity. */
    avatarVisible?: boolean;
    /** One accent per speaker so two agents in a turn stay distinguishable. */
    speaker?: MessageSpeaker;
}
/** Unboxed prose with a consistent avatar gutter; legacy inline names remain supported. */
declare function ConversationMessage({ agentName, agent, continued, avatarVisible, speaker, className, children, ...props }: ConversationMessageProps): React.JSX.Element;
interface MessageProseProps extends HTMLAttributes<HTMLDivElement> {
}
/** Reading type for a message body: 15px / 1.75, 18px between paragraphs. */
declare function MessageProse({ className, ...props }: MessageProseProps): React.JSX.Element;
interface MessageActionsProps extends HTMLAttributes<HTMLDivElement> {
}
/** Copy, vote and the quiet status line under a completed message. */
declare function MessageActions({ className, ...props }: MessageActionsProps): React.JSX.Element;
interface ArrivingTextProps {
    text: string;
    /** `phrase` staggers clause by clause, `paragraph` fades the whole block, `none` is static. */
    arrival?: MessageArrival;
    /** Delay between phrases, in ms. */
    stagger?: number;
}
/**
 * Text that arrives rather than appearing. Split on clause boundaries so a long sentence
 * resolves left to right. Reduced motion is handled by the provider, which removes the
 * animation outright.
 */
declare function ArrivingText({ text, arrival, stagger }: ArrivingTextProps): React.JSX.Element;

/** The approved icon glossary, enforced rather than restated at each call site. */
type ActivityStepKind = "thinking" | "action" | "tool" | "agent";
interface ActivityStep {
    /** Stable key and detail-disclosure identity. */
    id: string;
    kind: ActivityStepKind;
    /** One operational summary line. Not a transcript of private reasoning. */
    title: ReactNode;
    /** Revealed under the row when it is open. */
    detail?: ReactNode;
    /** `text` is a quiet paragraph, `code` a plain plane one tier up, `embed` any element. */
    detailKind?: "text" | "code" | "embed";
}
interface ActivityChainProps {
    steps: ActivityStep[];
    /** Index of the live step. `-1` (default) means every step has completed. */
    activeIndex?: number;
    /** The agent's name above its own chain in a multi-agent turn. */
    agentName?: ReactNode;
    /** Neutral while working; the speaker's accent once response text starts. */
    speaker?: MessageSpeaker | "neutral";
    /** Count summary and collapsed history appear at this many steps. */
    summaryThreshold?: number;
    /** Controlled summary expansion. Omit for internal state. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Controlled detail disclosure, by step id. Omit for internal state. */
    openStepId?: string | null;
    onOpenStepChange?: (id: string | null) => void;
    /** Accessible status text on the live step's loader. */
    statusLabel?: string;
    /** Tier for a `code` detail plane: one above whatever holds this chain. */
    codeSurface?: "elevated" | "elevated-2" | "top";
    className?: string;
}
/**
 * 01 · Activity rows and the step chain. The status mark and the chevron sit beside the label;
 * the count summary appears only at three or more steps; a completed step is a check and the
 * live step is the small inline loader. Presentational: the host supplies steps and callbacks.
 */
declare function ActivityChain({ steps, activeIndex, agentName, speaker, summaryThreshold, open, onOpenChange, openStepId, onOpenStepChange, statusLabel, codeSurface, className, }: ActivityChainProps): React.JSX.Element;

interface UserMessageProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
    /** The message text. Rendered as prose at rest and in the editor while editing. */
    value: string;
    /** Editing is host state; the component never keeps an unsaved copy of its own. */
    editing?: boolean;
    onValueChange?: (value: string) => void;
    editorLabel?: string;
    onSubmitEdit?: () => void;
    onCancelEdit?: () => void;
    submitting?: boolean;
    /** Edit / save / copy controls, right-aligned under the material. */
    actions?: ReactNode;
    textareaRef?: Ref<HTMLTextAreaElement>;
}
/**
 * 03 · User message — option A, composer-matched fill. The fill and the diffusion are the
 * composer's own `--il-fill` and `--il-focus`, so a sent message and the composer read as one
 * material. One edge: the hairline. The diffusion sits behind the content as a pseudo-element,
 * never as a second border.
 */
declare function UserMessage({ value, editing, onValueChange, editorLabel, actions, textareaRef, onSubmitEdit, onCancelEdit, submitting, className, style, ...props }: UserMessageProps): React.JSX.Element;

type ArtifactKind = "document" | "web" | "agent-session";
type ArtifactPhase = "waiting" | "working" | "complete";
interface ArtifactPreviewProps {
    kind: ArtifactKind;
    /** The artifact's own name, on one line, truncated rather than wrapped. */
    title: ReactNode;
    /** Kind and coordinate, e.g. `Markdown · workspace-direction.md`. Put paths in `<code>`. */
    coordinate?: ReactNode;
    /** Label on the disclosure trigger. Defaults to the kind's own word. */
    triggerLabel?: ReactNode;
    /** Controlled disclosure. Omit for internal state. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Before `complete`, the same card holds the large loader instead of an excerpt. */
    phase?: ArtifactPhase;
    /** Expand / download / copy, in the strip. */
    actions?: ReactNode;
    /** Transient status text under the body. */
    notice?: ReactNode;
    /**
     * `window` caps the excerpt at the reading window and fades content that really overruns.
     * `content` lets the card grow: an interactive body is never capped or faded.
     */
    fit?: "window" | "content";
    generatingLabel?: string;
    children?: ReactNode;
    className?: string;
}
/**
 * 04 · Inline preview — approved option B, "Strip and paper", with the glass-to-paper blend.
 * One glass card: a strip carrying the type icon, name, kind and coordinate and the actions,
 * then a plain paper plane running the full width that fades in over 30px so the material step
 * leaves no line. No divider, no nested card, no second graph layer.
 *
 * Code and markdown inside this card are plain and one tier above the paper: pass
 * `codeSurface="top"` to any `ActivityChain` rendered in `children`.
 */
declare function ArtifactPreview({ kind, title, coordinate, triggerLabel, open, onOpenChange, phase, actions, notice, fit, generatingLabel, children, className, }: ArtifactPreviewProps): React.JSX.Element;

type WorkspacePlacement = "inline" | "panel";
interface WorkspaceToolButtonProps extends Omit<ButtonProps, "children"> {
    label: string;
    icon: ReactNode;
    /** The pill sits at the left edge of the reading plane, so its hints open to the left. */
    side?: "top" | "bottom" | "left" | "right";
}
/**
 * One control in the tool pill. No fill on hover: the accent lands on the glyph alone, so a
 * column of seven controls stays quiet beside the document.
 */
declare function WorkspaceToolButton({ label, icon, side, className, style, ...props }: WorkspaceToolButtonProps): React.JSX.Element;
interface WorkspaceToolPillProps {
    /**
     * Elevation of the pill. The written approval (`reviews/2026-09-20-iter3-5-followup.md`
     * and the run's approved table) records "tool pill on the `top` tier", which is this
     * default. The live option-B specimen renders it at `elevated-2`; that discrepancy is
     * reported rather than silently resolved.
     */
    tier?: "top" | "elevated-2";
    children: ReactNode;
    className?: string;
}
/** The tool column beside the reading plane. It never overlaps the document. */
declare function WorkspaceToolPill({ tier, children, className }: WorkspaceToolPillProps): React.JSX.Element;
interface ArtifactWorkspaceProps {
    /** The file coordinate, in Mono. */
    name: ReactNode;
    /** Updated time, session owner, or the kind. */
    meta?: ReactNode;
    /** Full-screen and panel toggles, in the strip. */
    actions?: ReactNode;
    /** A `WorkspaceToolPill`, or nothing when the tools are collapsed. */
    tools?: ReactNode;
    /** Inline in the conversation, or filling the side panel. */
    placement?: WorkspacePlacement;
    /** A transient suggestion under the document. */
    suggestion?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * 05 · Expanded workspace — approved option B, "Strip and paper". The workspace paints no
 * ground of its own, so the only graph paper is the host's. One glass card: a strip carrying
 * the coordinate and the strip actions, then the paper document plane.
 *
 * Code and markdown inside the card are plain and one tier above the paper: pass
 * `codeSurface="top"` to any `ActivityChain` rendered in `children`.
 */
declare function ArtifactWorkspace({ name, meta, actions, tools, placement, suggestion, children, className }: ArtifactWorkspaceProps): React.JSX.Element;
interface WorkspaceEditorProps {
    value: string;
    onValueChange: (value: string) => void;
    label?: string;
    textareaRef?: Ref<HTMLTextAreaElement>;
    className?: string;
}
/**
 * Editing text sits exactly where reading text sits, and focus tints the card's single edge
 * instead of drawing a second rectangle inside the glass.
 */
declare function WorkspaceEditor({ value, onValueChange, label, textareaRef, className }: WorkspaceEditorProps): React.JSX.Element;
type WorkspaceFrame = "overlay" | "slot";
interface WorkspacePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Accessible name for the panel. Visually hidden. */
    title: string;
    /**
     * Where the panel is positioned.
     *
     * `overlay` (the default) is the approved Atlas specimen: a fixed, right-anchored 850px
     * column over the viewport, portalled to the body.
     *
     * `slot` is layout-agnostic: the panel positions nothing and fills the box its host gives
     * it, rendering in place rather than in a portal. Use this in a real application, where
     * the host lays the conversation column and the panel out side by side so the panel never
     * covers the control that opened it and the conversation stays live beside it.
     */
    frame?: WorkspaceFrame;
    /** Edge to edge instead of the 850px column. `overlay` only; in a slot the host owns width. */
    full?: boolean;
    children: ReactNode;
    className?: string;
}
/**
 * The non-modal side panel. It joins the conversation's world: nothing dims, blurs or
 * disables the chat, pointer events outside it do not dismiss it, it casts no shadow and
 * draws no border, and its ground dissolves over 36px at the leading edge. It closes from its
 * own toggle or with Escape, and focus returns to the trigger.
 *
 * Built directly on the Radix dialog primitive rather than the package `Drawer`, because
 * `Drawer` is modal by contract and owns a scrim, a header and a close control.
 *
 * The material — ground, graph, dissolve, no edge — is the same in both frames; only the
 * positioning differs, because where a panel sits is the host's decision and not this
 * component's.
 */
declare function WorkspacePanel({ open, onOpenChange, title, frame, full, children, className }: WorkspacePanelProps): React.JSX.Element;

type AlertTone = "progress" | "accent" | "ready" | "danger" | "sage" | "none";
type AlertMaterial = "tonal" | "glass";
type AlertEdge = "system" | "tone";
interface AlertStageProps extends HTMLAttributes<HTMLDivElement> {
}
/**
 * The shared measure for a request and its composer: same width, 10px apart. It also
 * establishes the size container the alert queries, so the hanging indent releases in a
 * narrow column rather than at a viewport width.
 */
declare function AlertStage({ className, ...props }: AlertStageProps): React.JSX.Element;
interface AlertProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
    /** One line, beside the tone icon. */
    title: ReactNode;
    /** 16px, in the alert's tone. */
    icon?: ReactNode;
    /** A small tag at the right of the head, e.g. "Permission". */
    kicker?: ReactNode;
    /** Previous / next controls at the right of the head. Replaces `kicker`'s position. */
    pager?: ReactNode;
    /**
     * `tonal` is the tonal-button wash at card scale over an opaque base, so graph lines never
     * run behind the words. `glass` is the package's own glass card, unmodified.
     */
    material?: AlertMaterial;
    /** One tone = one existing token set. It supplies fill, glow and ink — never the edge. */
    tone?: AlertTone;
    /** The system's neutral hairline is the default. A tone edge reads as two edges. */
    edge?: AlertEdge;
    glow?: boolean;
    /** One-line reason, under the title's text axis. */
    lede?: ReactNode;
    /** The command or coordinate, in a Mono chip. */
    command?: ReactNode;
    /**
     * The action row, left to right on the title's axis. The last child is right-aligned, so
     * `<Deny /><Clarify /><Allow />` reads exactly as the approved permission alert does.
     */
    actions?: ReactNode;
    /** Stacked answer rows. Their boxes span the card; their labels keep the title's axis. */
    choices?: ReactNode;
    children?: ReactNode;
}
/**
 * 06 / 07 · Alert. One anatomy, one material, one tone. Temporary, not an info card: it sits
 * directly above the composer at the composer's width.
 *
 * Approved members, locked 2026-09-20:
 * - permission — `material="tonal" tone="progress" edge="system" glow`
 * - question   — `material="glass" tone="none"`
 * Every other combination is available and unapproved.
 */
declare function Alert({ title, icon, kicker, pager, material, tone, edge, glow, lede, command, actions, choices, children, className, ...props }: AlertProps): React.JSX.Element;

interface RetryButtonProps extends Omit<IconButtonProps, "icon" | "label"> {
    label?: string;
    icon?: ReactNode;
}
/**
 * The retry beside a failed file card or a compact error. One control, one behaviour: the danger
 * tint's glow at rest, the danger set's hover ink, line and 18px glow on hover — the package's
 * button tokens, not a local colour.
 */
declare function RetryButton({ label, icon, className, ...props }: RetryButtonProps): React.JSX.Element;

type FileCardStatus = "ready" | "uploading" | "failed";
interface FileCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
    /** The file name, on the first line. */
    name: ReactNode;
    /** Type and size, or the status line, on the second. */
    detail: ReactNode;
    status?: FileCardStatus;
    /** Opens the file. The whole card body is the control; nothing nests inside it. */
    onOpen?: () => void;
    /** Shown only in the failed state. */
    onRetry?: () => void;
    retryLabel?: string;
    /** Removes a pending file; rendered inside the card beside the open control. */
    onRemove?: () => void;
    removeLabel?: string;
    uploadingLabel?: string;
    /** Overrides the ready-state symbol. */
    icon?: ReactNode;
}
/**
 * 08 · File card — approved option A, the two-line card: name first, type and size below.
 * The failed state takes the danger token set complete (on-tint ink, line, tint and an 18px
 * glow), and the retry behaves like the package's button tokens on hover, both per Daniel's
 * standing Iter 2 asks.
 */
declare function FileCard({ name, detail, status, onOpen, onRetry, onRemove, removeLabel, retryLabel, uploadingLabel, icon, className, ...props }: FileCardProps): React.JSX.Element;

interface ErrorMessageProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title: ReactNode;
    description?: ReactNode;
    onRetry?: () => void;
    retryLabel?: string;
    onOpen?: () => void;
    onDismiss?: () => void;
    dismissLabel?: string;
}
/** Reusable danger surface for message, upload, and future component failures. */
declare function ErrorMessage({ title, description, onRetry, retryLabel, onOpen, onDismiss, dismissLabel, className, ...props }: ErrorMessageProps): React.JSX.Element;

interface InlineSourceProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    /** Visible label — the source's name, not its URL. */
    children: ReactNode;
    href: string;
    /** Second line in the hint. Defaults to the href, which is what the specimen shows. */
    detail?: ReactNode;
    /** Suppress the hint when the surrounding text already names the source. */
    hint?: boolean;
}
/**
 * 09 · Inline source — the quiet chip. It reads as part of the sentence, reveals its name and
 * URL on hover or focus, and never grows into a card. Direction A, reviewed in Iter 2.
 */
declare function InlineSource({ children, href, detail, hint, className, target, rel, ...props }: InlineSourceProps): React.JSX.Element;

interface UnreadDividerProps extends HTMLAttributes<HTMLDivElement> {
    /** e.g. "New messages" or "2 new messages". */
    children: ReactNode;
    label?: string;
}
/**
 * 10 · Unread divider. A rule made of space and a label, not a drawn line across the column.
 * UNCONFIRMED: direction A was recorded in Iter 2, but the same note asked for changes this
 * specimen does not implement.
 */
declare function UnreadDivider({ children, label, className, ...props }: UnreadDividerProps): React.JSX.Element;
interface CompactErrorProps extends HTMLAttributes<HTMLDivElement> {
    /** What happened and what is safe, in one line. */
    children: ReactNode;
    /** The retry control. It sits on the same row, never below the text. */
    action?: ReactNode;
}
/**
 * 10 · Compact error and interruption. One object, one edge, the danger token set complete.
 * Daniel called this "actually pretty good" and wants it generalised later.
 * UNCONFIRMED, as above.
 */
declare function CompactError({ children, action, className, ...props }: CompactErrorProps): React.JSX.Element;
interface JumpToLatestProps {
    onClick?: () => void;
    /** `working` shows the large loader instead of the arrow. */
    state?: "latest" | "working";
    /** Visible label beside the mark. Omit for the mark alone. */
    children?: ReactNode;
    label?: string;
    /** Orientation line above the control. */
    caption?: ReactNode;
    className?: string;
}
/**
 * 10 · Jump control. A floating control in the conversation's own glass, not a filled button.
 * UNCONFIRMED, as above.
 */
declare function JumpToLatest({ onClick, state, children, label, caption, className }: JumpToLatestProps): React.JSX.Element;

type ConversationHeaderShape = "capsule" | "rounded";
interface ConversationParticipant {
    /** Stable React key. Falls back to `name`. */
    id?: string;
    /** Rendered as the avatar monogram and as the roster label once pinned. */
    name: string;
    /** Identity colour; fills the participant's avatar. */
    color?: AvatarColor;
    /** 0-100. `null` is honest unavailable telemetry: a dashed ring, never 0%. */
    contextPercent?: number | null;
    /** One short word for the avatar's accessible name and its native title. */
    status?: string;
    /** The quiet roster mark: a count, `!`, `?`. Empty or omitted renders nothing. */
    mark?: string;
    /**
     * Attention tone on the mark. Defaults to "the mark is not a plain count", which is what
     * the approved study renders: a numeric mark is calm, a symbol is warm.
     */
    attention?: boolean;
    src?: string;
}
interface ConversationHeaderProps {
    /** The conversation's own title. Truncates at rest and completes on hover. */
    title: string;
    onTitleSave?: (value: string) => void | Promise<void>;
    titleEditing?: boolean;
    onTitleEditingChange?: (editing: boolean) => void;
    /** A capsule with circular avatars, or a rounded card with square ones. */
    shape: ConversationHeaderShape;
    /** 1 to 6. Beyond 6 the approved composites stop and the last one is reused. */
    participants: ConversationParticipant[];
    /** The narrower endpoint pair (320 / 368 instead of 420 / 468). */
    constrained?: boolean;
    /** Linked project / work item, shown in the subtitle row at every state. */
    linkedWork?: ReactNode;
    /** Keeps the card open while a linked-work preview is up. */
    linkedWorkOpen?: boolean;
    /** Quiet identity line that appears with the split. */
    chatId?: ReactNode;
    /** Contents of the link-project popover. The button renders only when this is given. */
    linkPopover?: ReactNode;
    linkLabel?: string;
    linkIcon?: ReactNode;
    linkOpen?: boolean;
    onLinkOpenChange?: (open: boolean) => void;
    /** Agent detail for a roster avatar. Return `null` to leave that avatar inert. */
    renderParticipantDetail?: (participant: ConversationParticipant, index: number) => ReactNode;
    /** Scopes this header's own popovers so an outside-click never closes its own layers. */
    owner: string;
    /** Controlled roster separation. Omit for internal state. */
    pinned?: boolean;
    onPinnedChange?: (pinned: boolean) => void;
    /** Controlled agent detail, by roster index. Omit for internal state. */
    activeParticipant?: number | null;
    onActiveParticipantChange?: (index: number | null) => void;
    /** Fires when the card widens or narrows (hover, focus, pin, linked-work preview). */
    onExpandedChange?: (expanded: boolean) => void;
    className?: string;
    restAvatarHeight?: number;
    expandedAvatarSize?: number;
    layoutKey?: string;
    splitGap?: number;
    splitCushion?: number;
    splitMin?: number;
    splitMax?: number;
    /** A `conversationHeader` material variant. When set, the glass slot is painted by it alone. */
    material?: "chathead";
}
interface ContextRingProps {
    shape: ConversationHeaderShape;
    /** 0-100, or `null` for unavailable telemetry (a dashed track). */
    percent?: number | null;
    className?: string;
}
/**
 * The per-agent context meter drawn around an avatar. Semantic colours at the approved
 * 80 / 90 thresholds; an unknown reading is dashed and dim rather than an implied zero.
 */
declare function ContextRing({ shape, percent, className }: ContextRingProps): React__default.JSX.Element;
/**
 * The approved Atlas 2 conversation header. One identity: a Yrsa title that completes on
 * hover, a varied-size avatar composite that stays calm from one to six participants, and a
 * click that separates the roster. The host supplies proportional widths and approved
 * interior spacing through the shared layout styles.
 *
 * Presentational and controlled: participants, linked work and the agent detail all arrive as
 * props. The component owns only the interaction state the approved behaviour is made of
 * (hover disclosure, the split clock, the hover-preview-then-pin detail), and every piece of
 * that state can be lifted with the matching `on*Change` pair.
 */
declare function ConversationHeader({ title, onTitleSave, titleEditing, onTitleEditingChange, shape, participants, constrained, linkedWork, linkedWorkOpen, chatId, linkPopover, linkLabel, linkIcon, linkOpen, onLinkOpenChange, renderParticipantDetail, owner, pinned, onPinnedChange, activeParticipant, onActiveParticipantChange, onExpandedChange, className, restAvatarHeight, expandedAvatarSize, layoutKey, splitGap, splitCushion, splitMin, splitMax, material, }: ConversationHeaderProps): React__default.JSX.Element;

interface AgentPermissionOption {
    value: string;
    label: string;
    icon: ReactNode;
}
interface AgentSubagent {
    name: string;
    /** One line about what it is doing. */
    activity?: ReactNode;
    working?: boolean;
}
interface AgentBackgroundProcess {
    name: string;
    running?: boolean;
    /** 0-100. Shown as a dim trailing value; there is no second progress bar on the card. */
    progress?: number;
}
interface AgentWorkingFile {
    name: string;
    active?: boolean;
}
interface AgentDetailCardProps {
    name: string;
    /** Circle in the capsule variant, square in the rounded one. */
    shape: ConversationHeaderShape;
    /** The 60px avatar's meter. Pass the header's own `<ContextRing/>`. */
    contextRing?: ReactNode;
    avatarSrc?: string;
    /** Opens the agent profile / loadout. Tooltip only — no text label anywhere. */
    profilePopover?: ReactNode;
    profileLabel?: string;
    /** Harness mark, left of the surface word in the subtitle. */
    harness?: ReactNode;
    harnessLabel?: string;
    /** Running surface, click to edit. Empty renders "Add surface". */
    surface?: string;
    onSurfaceChange?: (value: string) => void;
    /** Rest is the icon alone; hover or focus adds the word; click opens the detail. */
    status: string;
    statusIcon: ReactNode;
    statusDetail?: ReactNode;
    since?: ReactNode;
    /** Warms the status icon and adds the honest "respond elsewhere" line. */
    blocked?: boolean;
    blockedNote?: ReactNode;
    /** Platform session id, Plex Mono, muted. */
    sessionId?: ReactNode;
    /** `null` is unavailable telemetry: a dashed track, never 0%. */
    used: number | null;
    capacity: number;
    permission: string;
    permissionOptions: AgentPermissionOption[];
    onPermissionChange: (value: string) => void;
    model: string;
    modelOptions: string[];
    onModelChange: (value: string) => void;
    reasoning: string;
    reasoningOptions: string[];
    onReasoningChange: (value: string) => void;
    /** The bot mark and the Subagents row render only when this has entries. */
    subagents?: AgentSubagent[];
    /** The Background row renders only when this has entries. */
    background?: AgentBackgroundProcess[];
    /** Drives the Working files count and the live items that show through when closed. */
    files?: AgentWorkingFile[];
    /** The opened Working files row — pass a wired `<WorkingFilesList/>`. */
    workingFiles?: ReactNode;
    /** Scopes this card's popovers so an outside-click never closes the header. */
    owner: string;
    className?: string;
}
/**
 * The approved Atlas 2 agent detail card, "profile" layout. Agent information only: Daniel,
 * intent ledger I17 — "the agent card should just be for agent info. things like the action
 * and questions should be somewhere else." No Allow / Decline, no answer field, no action
 * panel; question and permission PROMPTS belong to a later fleet interface, while the
 * permission SETTING lives here.
 *
 * Two planes in one 376px card. The agent plane is the glass itself; the session plane holds
 * what changes between sessions and is separated by space and a 30px material fade rather
 * than by a rule. Status reads icon at rest, word on hover or focus, detail on click. Work
 * rows are closed by default and anything in progress shows through beneath the closed row.
 *
 * Presentational and controlled throughout: every value and every callback is a prop.
 */
declare function AgentDetailCard({ name, shape, contextRing, avatarSrc, profilePopover, profileLabel, harness, harnessLabel, surface, onSurfaceChange, status, statusIcon, statusDetail, since, blocked, blockedNote, sessionId, used, capacity, permission, permissionOptions, onPermissionChange, model, modelOptions, onModelChange, reasoning, reasoningOptions, onReasoningChange, subagents, background, files, workingFiles, owner, className, }: AgentDetailCardProps): React__default.JSX.Element;

interface LinkedWorkLinksProps extends React__default.HTMLAttributes<HTMLSpanElement> {
}
/**
 * The quiet row of linked-work words in the conversation header's subtitle. The header's copy
 * column is pointer-inert so the title never eats a click; this wrapper opts its links back in.
 */
declare function LinkedWorkLinks({ className, ...props }: LinkedWorkLinksProps): React__default.JSX.Element;
/** The middot between a project and its work item. */
declare function LinkedWorkDivider(): React__default.JSX.Element;
interface LinkedWorkTriggerProps {
    /** The word itself — a project name, a module, a task. */
    label: ReactNode;
    /** Spoken name, e.g. `Preview project: Caelos Console`. */
    ariaLabel: string;
    /** The preview body. Everything inside the popover belongs to the host. */
    children: ReactNode;
    /** Scopes the preview so an outside-click on it never closes the header. */
    owner: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Use the shared Task Graph drawer for application detail views. */
    presentation?: "popover" | "drawer";
    drawerTitle?: string;
    /** Preview width in px. Omit to let the resize grip own it from 500. */
    width?: number;
    onWidthChange?: (width: number) => void;
    /** Turns the resize grip off. */
    resizable?: boolean;
    /** Keeps the preview open through a host dialog or menu of its own. */
    onInteractOutside?: (event: Event) => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    className?: string;
}
/**
 * The approved Atlas 2 linked-work trigger and preview.
 *
 * The preview does not hang off the word — it hangs off the CONVERSATION CARD. A virtual
 * Radix anchor is pointed at the nearest `[data-nc-conversation-card]` ancestor and tracked
 * every frame while the preview is open, so the surface stays attached to the card's bottom
 * edge through the split, the hover widening and a window resize alike. Collision avoidance
 * is off and the horizontal offset is measured instead, which is what keeps the join at
 * roughly half a pixel rather than letting Radix flip the surface somewhere else.
 *
 * Presentational: the body is `children`. The Atlas's own Task Graph body stays in the Atlas.
 */
declare function LinkedWorkTrigger({ label, ariaLabel, children, owner, open, onOpenChange, presentation, drawerTitle, width, onWidthChange, resizable, onInteractOutside, onEscapeKeyDown, className, }: LinkedWorkTriggerProps): React__default.JSX.Element;

interface WorkingFile {
    name: string;
    path: string;
    /** One line under the row when its disclosure is open. */
    summary?: ReactNode;
    /** The diff affordance renders only when the file has changes to show. */
    hasDiff?: boolean;
    /** Shows the small inline loader beside the name while the file is being worked on. */
    active?: boolean;
}
/** The four things the row can ask a host drawer to show. */
type WorkingFileView = "file" | "diff" | "external" | "move";
interface WorkingFilesListProps {
    files: WorkingFile[];
    label?: ReactNode;
    /** Scopes this list's context menu so an outside-click on it never closes the header. */
    owner: string;
    /**
     * The drawer hook. The list never opens a panel of its own: it asks, and the host renders
     * whatever surface it wants — `WorkingFileDrawerBody` reproduces the approved contents.
     * `trigger` is the element focus should return to.
     */
    onOpenFile?: (file: WorkingFile, view: WorkingFileView, trigger?: HTMLElement) => void;
    onCopyPath?: (file: WorkingFile) => void;
    /** Controlled row disclosure, by file name. Omit for internal state. */
    expanded?: string | null;
    onExpandedChange?: (name: string | null) => void;
    diffIcon?: ReactNode;
    /** A quiet status line under the list, e.g. "Path copied". */
    notice?: ReactNode;
    className?: string;
}
/**
 * The approved Atlas 2 working-files list. A row is a name you can open, a disclosure for its
 * summary, a flexible dead zone that also toggles the summary, and a diff icon when the file
 * has changes. Right-click (or the context-menu key) opens File viewer / External app / Copy
 * pathname / Move file, and focus returns to the row the menu came from.
 *
 * Presentational: files arrive as props, no workspace is read, and no drawer is rendered here.
 */
declare function WorkingFilesList({ files, label, owner, onOpenFile, onCopyPath, expanded, onExpandedChange, diffIcon, notice, className, }: WorkingFilesListProps): React__default.JSX.Element;
interface WorkingFileDrawerBodyProps {
    name: ReactNode;
    path: ReactNode;
    /** Marks the body so the header's outside-click handler treats it as its own layer. */
    owner: string;
    children?: ReactNode;
    className?: string;
}
/**
 * The approved body of the file panel, for a host `Drawer`. Carries `data-agent-file-layer`,
 * which is what tells the conversation header this is one of its own surfaces rather than an
 * outside click.
 */
declare function WorkingFileDrawerBody({ name, path, owner, children, className, }: WorkingFileDrawerBodyProps): React__default.JSX.Element;
interface FileCodeProps {
    children?: ReactNode;
    /** Renders each line with the approved added / removed tones instead of plain code. */
    diff?: string[];
    className?: string;
}
/** Plain pre-formatted file text, or a previous-to-current comparison. */
declare function FileCode({ children, diff, className }: FileCodeProps): React__default.JSX.Element;
/** The move-file form's layout, for a host that wires its own submit. */
declare function FileMoveForm({ className, ...props }: React__default.FormHTMLAttributes<HTMLFormElement>): React__default.JSX.Element;

/** Approved geometry and motion, 2026-09-20. Material/color remain open for review.
 * The Atlas study implementation is also used by staging; full Panda conversion is pending.
 */
declare const agentAvatarSizes: {
    readonly xl: 48;
    readonly xxl: 54;
};
declare const approvedHeaderLayout: {
    readonly restPercent: 45;
    readonly expandedPercent: 56;
    readonly density: "compact";
    readonly matchComposerHeight: false;
    readonly split: {
        readonly gap: 30;
        readonly cushion: 60;
        readonly minText: 280;
        readonly maxText: 460;
    };
    readonly spacing: {
        readonly block: 5;
        readonly leading: 7;
        readonly trailing: 4;
        readonly gap: 7;
    };
    readonly curveCompensation: 10;
    readonly avatarTiers: readonly [{
        readonly rest: "xxl";
        readonly expanded: "xl";
    }, {
        readonly rest: "xxl";
        readonly expanded: 40;
    }, {
        readonly rest: "xxl";
        readonly expanded: 32;
    }];
};
declare const approvedHeaderMotion: {
    readonly split: {
        readonly type: "spring";
        readonly stiffness: 280;
        readonly damping: 34;
        readonly mass: 1;
        readonly restDelta: 0.001;
        readonly restSpeed: 0.01;
    };
    readonly disclosure: {
        readonly duration: 0.26;
        readonly ease: [number, number, number, number];
    };
    readonly titleReveal: {
        readonly duration: 0.34;
        readonly ease: [number, number, number, number];
    };
    readonly titleCollapse: {
        readonly duration: 0.13;
        readonly delay: 0;
    };
};

interface ChatHistoryNavigationProps {
    onBack: () => void;
    onForward: () => void;
    canGoBack?: boolean;
    canGoForward?: boolean;
}
/** Host supplies history; the shared component owns the paired tonal controls and spacing. */
declare function ChatHistoryNavigation({ onBack, onForward, canGoBack, canGoForward }: ChatHistoryNavigationProps): React__default.JSX.Element;
interface RightPanelToggleProps extends Omit<IconButtonProps, "label" | "icon" | "variant" | "onClick"> {
    open: boolean;
    onToggle: () => void;
}
declare function RightPanelToggle({ open, onToggle, className, ...props }: RightPanelToggleProps): React__default.JSX.Element;

interface ConversationWelcomeProps {
    /** Host-provided transparent brand asset. */
    wordmarkSrc?: string;
    /** Host-owned welcome heading; changing copy does not change the recipe. */
    title?: string;
    /** Host-owned supporting copy. */
    description?: string;
}
/** The host owns positioning inside the available conversation pane. */
declare function ConversationWelcome({ wordmarkSrc, title, description, }: ConversationWelcomeProps): React__default.JSX.Element;

/** Approved welcome composition, 2026-09-21. Copy remains component props. */
declare const conversationWelcomeTokens: {
    readonly "--nc-welcome-wordmark-width": "288px";
    readonly "--nc-welcome-wordmark-scale": "0.6375";
    readonly "--nc-welcome-wordmark-offset": "calc(var(--nc-graph-size) + var(--sys-space-3) + var(--sys-space-1))";
    readonly "--nc-welcome-wordmark-gap": "var(--sys-space-4)";
    readonly "--nc-welcome-title-size": "clamp(32px, 4vw, 44px)";
    readonly "--nc-welcome-title-leading": "1.1";
    readonly "--nc-welcome-description-size": "12px";
    readonly "--nc-welcome-description-leading": "18px";
    readonly "--nc-welcome-description-gap": "var(--sys-space-4)";
};

type NotificationKind = "error" | "permission" | "question" | "ready" | "attention";
interface NotificationAction {
    id: string;
    label: string;
    primary?: boolean;
    /** Resolve only after the host operation succeeds. Return false to keep the request open. */
    run: (value?: string) => void | boolean | Promise<void | boolean>;
    resolves?: boolean;
}
interface NotificationItem {
    /** Stable source/event ID: publishing the same ID updates rather than duplicates it. */
    id: string;
    kind: NotificationKind;
    title: string;
    source?: string;
    detail?: string;
    command?: string;
    choices?: string[];
    actions?: NotificationAction[];
    /** Host owns the real permission/question response. Omit to show a read-only request. */
    onReply?: (value: string, mode: "answer" | "clarify") => void | boolean | Promise<void | boolean>;
}
interface NotificationCardProps {
    item: NotificationItem;
    onDismiss: () => void;
    onResolve: () => void;
    draft?: string;
    onDraftChange?: (value: string) => void;
    onInteractionChange?: (active: boolean) => void;
}
declare function NotificationCard({ item, onDismiss, onResolve, draft: controlledDraft, onDraftChange, onInteractionChange }: NotificationCardProps): React__default.JSX.Element;
interface NotificationContextValue {
    items: NotificationItem[];
    publish: (item: NotificationItem) => void;
    resolve: (id: string) => void;
    show: (id: string) => void;
    inboxOpen: boolean;
    toggleInbox: () => void;
}
declare function useNotifications(): NotificationContextValue;
declare function NotificationButton(): React__default.JSX.Element;
/** Place once above all product surfaces. Closing a popup never resolves its source request. */
declare function NotificationProvider({ children, popupDuration }: {
    children: ReactNode;
    popupDuration?: number;
}): React__default.JSX.Element;

interface TitleProps {
    value: string;
    variant?: "project" | "module" | "task" | "conversation" | "navigation";
    as?: "h1" | "h2" | "h3" | "span";
    onSave?: (value: string) => void | Promise<void>;
    editing?: boolean;
    onEditingChange?: (editing: boolean) => void;
    className?: string;
    children?: ReactNode;
    editLabel?: string;
    maxLength?: number;
}
/** Shared entity title. Double-click/Enter/F2 edits; Enter/blur saves; Escape cancels. */
declare function Title({ value, variant, as: Tag, onSave, editing: controlled, onEditingChange, className, children, editLabel, maxLength }: TitleProps): React__default.JSX.Element;

interface WorkItemDrawerProps extends Omit<DialogProps, "title"> {
    variant: "task" | "module" | "project" | "initiative";
    title: string;
    onTitleSave?: TitleProps["onSave"];
    breadcrumbs?: ReactNode;
    status?: ReactNode;
    activity?: ReactNode;
}
/** A shared drawer shell, with the original module/task header and body rhythm. */
declare function WorkItemDrawer({ variant, title, onTitleSave, breadcrumbs, status, activity, children, onEscapeKeyDown, ...props }: WorkItemDrawerProps): React__default.JSX.Element;
declare function WorkItemDrawerSection({ title, actions, children }: {
    title: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}): React__default.JSX.Element;
declare function WorkItemDrawerActions({ children }: {
    children: ReactNode;
}): React__default.JSX.Element;

declare function SidePanelResizeHandle({ side, className, ...props }: ResizeHandleProps): React__default.JSX.Element;
interface SidePanelProps extends HTMLAttributes<HTMLDivElement> {
    side: "left" | "right";
    label: string;
    storageKey?: string;
    defaultWidth?: number;
    defaultRatio?: number;
    minWidth?: number;
    maxWidth?: number;
    /** Space reserved for the adjacent surface; the available container wins on narrow screens. */
    reserveWidth?: number;
    full?: boolean;
}
/** Resizable docked panel. Observe its container so opening navigation also reclamps its width. */
declare function SidePanel({ side, label, storageKey, defaultWidth, defaultRatio, minWidth, maxWidth, reserveWidth, full, style, className, children, ...props }: SidePanelProps): React__default.JSX.Element;

interface SidebarSearchProps {
    variant: "chat" | "taskgraph";
    value: string;
    onValueChange: (value: string) => void;
    onAction?: () => void;
    /** Wrap the shared trigger with a menu when the surface has multiple create actions. */
    renderAction?: (trigger: ReactElement) => ReactNode;
}
/** Shared sidebar search field and circular create action; content stays with the host. */
declare function SidebarSearch({ variant, value, onValueChange, onAction, renderAction }: SidebarSearchProps): React__default.JSX.Element;

interface UserAccountProps {
    name: string;
    image?: string;
    compact?: boolean;
    loading?: boolean;
    theme: "light" | "dark";
    onAccount: () => void;
    onCredentials: () => void;
    onViewArchive: () => void;
    onToggleTheme: () => void;
}
/** Reusable identity trigger and account menu; account data/actions remain owned by the host. */
declare function UserAccount({ name, image, compact, loading, theme, onAccount, onCredentials, onViewArchive, onToggleTheme }: UserAccountProps): React__default.JSX.Element;

type HarnessIconProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
};
declare const ClaudeCodeIcon: React.ForwardRefExoticComponent<Omit<HarnessIconProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
declare const CodexIcon: React.ForwardRefExoticComponent<Omit<HarnessIconProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
declare const HermesIcon: React.ForwardRefExoticComponent<Omit<HarnessIconProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

interface ProgressiveSelectorOption<Value extends string = string> {
    value: Value;
    icon: ReactNode;
    label: string;
}
interface ProgressiveSelectorExtension {
    expanded: boolean;
    owner: string;
    onPresenceChange: (present: boolean) => void;
    onPin: () => void;
}
interface ProgressiveSelectorProps<Value extends string = string> {
    value: Value;
    onValueChange: (value: Value) => void;
    options: readonly ProgressiveSelectorOption<Value>[];
    label: string;
    tooltip?: string;
    className?: string;
    /** Composer integration: dock outside the complete writing surface. */
    dockBoundary?: HTMLElement | null;
    /** Composer's approved horizontal alignment relative to the trigger. */
    rightOffset?: number;
    /** Preserve the approved composer dimensions; other consumers measure their labels. */
    composer?: boolean;
    /** Optional nested agent review control, owned by the composer. */
    renderLeading?: (extension: ProgressiveSelectorExtension) => ReactNode;
}
/** One stable trigger, an icon-only hover preview, and a pinned labeled selector. */
declare function ProgressiveSelector<Value extends string>({ value, onValueChange, options, label, tooltip, className, dockBoundary, rightOffset, composer, renderLeading, }: ProgressiveSelectorProps<Value>): React.JSX.Element | null;

interface OverviewCardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "project" | "chat";
    /** Keep the revealed fill while the card's disclosure is open. */
    expanded?: boolean;
    /** Blur only when content, rather than the ambient grid, passes beneath the card. */
    occluded?: boolean;
}
declare function OverviewCard({ variant, expanded, occluded, className, children, ...props }: OverviewCardProps): React__default.JSX.Element;

type ChatStatusKind = "attention" | "responding" | "rest" | "idle";
declare const chatStatusLabels: Record<ChatStatusKind, string>;
declare const chatStatusDescriptions: Record<ChatStatusKind, string>;
interface ChatStatusProps extends HTMLAttributes<HTMLSpanElement> {
    status: ChatStatusKind;
    display?: "compact" | "labeled";
}
/** Presentation only: hosts supply lifecycle state. No per-card clocks or live announcements. */
declare function ChatStatus({ status, display, className, ...props }: ChatStatusProps): React__default.JSX.Element;

type ChatOverviewLink = {
    label: string;
    onOpen?: () => void;
};
interface ChatOverviewCardProps {
    id: string;
    title: string;
    agents: AgentIdentity[];
    status: ChatStatusKind;
    createdLabel: string;
    project?: ChatOverviewLink;
    workItem?: ChatOverviewLink & {
        kind?: string;
    };
    onOpen: () => void;
}
/** Header-derived overview; Atlas and staging use the same layout and disclosure. */
declare function ChatOverviewCard({ id, title, agents, status, createdLabel, project, workItem, onOpen }: ChatOverviewCardProps): React__default.JSX.Element;

/**
 * The approved header (geometry and motion locked 2026-09-20, 23:19 screenshot), following the
 * actual Composer in its pane. Ported from the staging adapter so the package owns it.
 *
 * `material` selects the painted layer. "chathead" (nc-chathead, the default) is a
 * `conversationHeader` recipe variant. "composer" is the approved study's Composer-material
 * proposal; any other value leaves the glass layer to a host-supplied rule scoped by
 * `[data-material=<value>]` — which is how the Foundry's Create tab previews new materials
 * without touching the approved geometry.
 *
 * Content behind the header: when the pane holds a `[data-conversation-scroll]` scroller with a
 * `[data-occlusion-sentinel]` spanning the top of its content, the header drives
 * `--nc-occluded` from 0 (nothing behind) to 1 (content behind). Without them it stays
 * undriven, which the material reads as 1.
 */
declare function ApprovedChatHeader({ material, ...props }: Omit<ConversationHeaderProps, "material"> & {
    material?: string;
}): React.JSX.Element;

/** Approved responsive conversation geometry; shared by staging and design fixtures. */
declare const conversationWidthLayout: {
    readonly lowerThreshold: 640;
    readonly upperThreshold: 1320;
    readonly lowerOuterMargin: 10;
    readonly upperOuterMargin: 64;
    readonly overhangLowerThreshold: 1024;
    readonly overhangUpperThreshold: 1748;
    readonly maximumOverhang: 200;
    readonly maximumComposerWidth: 1220;
};
/** All measurements use the available conversation pane, excluding other panels. */
declare function getConversationWidths(availableWidth: number): {
    paneWidth: number;
    chatWidth: number;
    composerWidth: number;
    overhang: number;
    outerMargin: number;
    progress: number;
};

/** Approved B artwork. Geometry is shared with assets/caelos; do not redraw or retype. */
type CaelosLogoProps = Omit<SVGProps<SVGSVGElement>, "children" | "dangerouslySetInnerHTML"> & {
    /** Rendered height in pixels; width follows the approved aspect ratio. */
    size?: number;
    /** Hide from assistive technology when adjacent text already names Caelos. */
    decorative?: boolean;
};
declare const CaelosIcon: React.ForwardRefExoticComponent<Omit<CaelosLogoProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
declare const CaelosWordmark: React.ForwardRefExoticComponent<Omit<CaelosLogoProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
declare const CaelosLogo: React.ForwardRefExoticComponent<Omit<CaelosLogoProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

export { ActionMenu, ActionMenuCheckboxItem, ActionMenuContent, ActionMenuItem, type ActionMenuProps, ActionMenuRoot, ActionMenuSeparator, ActionMenuTrigger, ActionRow, ActivityChain, type ActivityChainProps, type ActivityStep, type ActivityStepKind, AgentAvatar, type AgentBackgroundProcess, AgentDetailCard, type AgentDetailCardProps, type AgentIdentity, AgentMessage, type AgentMessageProps, type AgentPermissionOption, type AgentSubagent, type AgentWorkingFile, Alert, type AlertEdge, type AlertMaterial, type AlertProps, AlertStage, type AlertStageProps, type AlertTone, ApprovedChatHeader, ArrivingText, type ArrivingTextProps, type ArtifactKind, type ArtifactPhase, ArtifactPreview, type ArtifactPreviewProps, ArtifactWorkspace, type ArtifactWorkspaceProps, Avatar, type AvatarColor, type AvatarProps, Badge, Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, Button, type ButtonProps, CaelosIcon, CaelosLogo, type CaelosLogoProps, CaelosProvider, type CaelosProviderProps, CaelosWordmark, Card, type CardProps, ChatHistoryNavigation, type ChatHistoryNavigationProps, ChatOverviewCard, type ChatOverviewCardProps, type ChatOverviewLink, ChatStatus, type ChatStatusKind, type ChatStatusProps, Checkbox, Chip, type ChipProps, ClaudeCodeIcon, CodexIcon, CompactError, type CompactErrorProps, Composer, type ComposerAddition, type ComposerAgent, ComposerChoice, type ComposerChoiceProps, type ComposerCommand, type ComposerMessage, type ComposerProps, ContextMenu, type ContextMenuAction, type ContextMenuActionState, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, type ContextMenuTarget, ContextMenuTrigger, ContextRing, type ContextRingProps, ConversationColumn, type ConversationColumnProps, ConversationHeader, type ConversationHeaderProps, type ConversationHeaderShape, ConversationMessage, type ConversationMessageProps, type ConversationParticipant, ConversationWelcome, type ConversationWelcomeProps, type Density, Dialog, type DialogProps, Disclosure, type DisclosureProps, Drawer, ErrorMessage, type ErrorMessageProps, FieldGroup, FileCard, type FileCardProps, type FileCardStatus, FileCode, type FileCodeProps, FileMoveForm, Heading, HermesIcon, IconButton, type IconButtonProps, InlineCluster, InlineSource, type InlineSourceProps, Input, type InputProps, Inset, JumpToLatest, type JumpToLatestProps, LinkButton, LinkedWorkDivider, LinkedWorkLinks, type LinkedWorkLinksProps, LinkedWorkTrigger, type LinkedWorkTriggerProps, Loading, type MenuOption, MessageActions, type MessageActionsProps, type MessageArrival, MessageProse, type MessageProseProps, type MessageSpeaker, type NotificationAction, NotificationButton, NotificationCard, type NotificationCardProps, type NotificationItem, type NotificationKind, NotificationProvider, NovaLoader, type NovaLoaderProps, OverviewCard, type OverviewCardProps, PermissionControl, type PermissionControlProps, PermissionsIcon, PersonChip, type PersonChipProps, Popover, PopoverClose, PopoverContent, PopoverTrigger, Progress, ProgressiveSelector, type ProgressiveSelectorExtension, type ProgressiveSelectorOption, type ProgressiveSelectorProps, Range, type ReplyFormat, ResizeHandle, type ResizeHandleProps, ResponsiveGrid, RetryButton, type RetryButtonProps, RightPanelToggle, type RightPanelToggleProps, RippleLoader, type RippleLoaderProps, Row, RowGroup, type RowProps, STATUS_OPTIONS, ScrollArea, type ScrollAreaProps, Section, type SectionProps, SectionStack, Select, SelectMenu, type SelectMenuProps, type SelectProps, Separator, SidePanel, type SidePanelProps, SidePanelResizeHandle, SidebarSearch, type SidebarSearchProps, SpacingDensity, type SpacingLayoutProps, Stack, StatusSelect, Surface, Tabs, TabsContent, TabsList, type TabsProps, TabsRoot, TabsTrigger, TargetContextMenu, type TargetContextMenuProps, TaskRow, type TaskRowProps, Text, TextArea, type TextAreaProps, type Theme, type ThemeSettings, Title, type TitleProps, Toaster, type Tone, Tooltip, type TooltipProps, UnreadDivider, type UnreadDividerProps, UserAccount, type UserAccountProps, UserCard, type UserCardProps, UserMessage, type UserMessageProps, WorkItemDrawer, WorkItemDrawerActions, type WorkItemDrawerProps, WorkItemDrawerSection, type WorkingFile, WorkingFileDrawerBody, type WorkingFileDrawerBodyProps, type WorkingFileView, WorkingFilesList, type WorkingFilesListProps, WorkspaceEditor, type WorkspaceEditorProps, type WorkspaceFrame, WorkspacePanel, type WorkspacePanelProps, type WorkspacePlacement, WorkspaceToolButton, type WorkspaceToolButtonProps, WorkspaceToolPill, type WorkspaceToolPillProps, agentAvatarSizes, approvedHeaderLayout, approvedHeaderMotion, approvedTokens, avatarColors, chatStatusDescriptions, chatStatusLabels, contextMenuVariants, conversationWelcomeTokens, conversationWidthLayout, getConversationWidths, themeAttributes, useCaelosTheme, useNotifications };
