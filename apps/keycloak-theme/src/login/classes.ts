import type { ClassKey } from "keycloakify/login"

import { linkButton } from "@workspace/ui-patterns/link-button"

/**
 * Tailwind for the pages keycloakify renders itself (error, info, expired link, update password, account linking,
 * OTP...), so they match the custom login page without ejecting each one. Patternfly is off (doUseDefaultCss=false).
 */
const input =
  "h-10 w-full rounded-xl bg-background px-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-shadow focus-visible:shadow-[inset_0_0_0_1px_var(--ring)] aria-invalid:shadow-[inset_0_0_0_1px_var(--color-red-500)]"

export const classes = {
  kcFormClass: "flex flex-col gap-4",
  kcFormGroupClass: "flex flex-col gap-1.5",
  kcLabelWrapperClass: "",
  kcLabelClass: "text-sm font-medium",
  kcInputWrapperClass: "",
  kcInputClass: input,
  kcTextareaClass: input,
  kcInputGroup: "",
  // Its eye icon is a Patternfly font glyph (off here): an empty button would only narrow the field.
  kcFormPasswordVisibilityButtonClass: "hidden",
  kcInputErrorMessageClass: "text-sm text-red-600 dark:text-red-400",
  kcInputHelperTextBeforeClass: "text-xs text-muted-foreground",
  kcInputHelperTextAfterClass: "text-xs text-muted-foreground",
  kcFormOptionsClass: "text-sm",
  kcFormOptionsWrapperClass:
    "text-sm text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-foreground",
  kcFormSettingClass: "flex items-center justify-between gap-3",
  kcFormButtonsClass: "flex flex-col gap-3 pt-2",
  kcButtonClass: linkButton({
    variant: "outline",
    // Keycloakify disables submit until the form is valid (e.g. password policy): show it.
    className: "disabled:pointer-events-none disabled:opacity-50",
  }),
  kcButtonPrimaryClass:
    "bg-primary text-primary-foreground ring-0 hover:bg-primary/90",
  kcButtonDefaultClass: "",
  kcButtonBlockClass: "w-full",
  kcButtonLargeClass: "",
  kcCheckboxInputClass: "mr-2 size-4 align-middle accent-primary",
  kcInputClassCheckbox: "flex items-center gap-2",
  kcInputClassCheckboxInput: "size-4 accent-primary",
  kcInputClassCheckboxLabel: "text-sm",
  kcInputClassRadio: "flex items-center gap-2",
  kcInputClassRadioInput: "size-4 accent-primary",
  kcInputClassRadioLabel: "text-sm",
  kcSrOnlyClass: "sr-only",
} satisfies { [key in ClassKey]?: string }
