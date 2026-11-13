import { i18nBuilder } from "keycloakify/login"

import type { ThemeName } from "../kc.gen"

/**
 * Keycloak's own messages, plus Vietnamese (Keycloak ships none) and the WattPrint wording, kept identical to the
 * dashboard's sign-in page (apps/dashboard/messages/{vi,en}/auth.json). Translations must stay inline: keycloakify
 * reads them at build time so Keycloak's server-side messages use them too.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keycloakify's pattern: a value only read for its type
const { useI18n, ofTypeI18n } = i18nBuilder
  .withThemeName<ThemeName>()
  .withExtraLanguages({
    vi: { label: "Tiếng Việt", getMessages: () => import("./i18n.vi") },
  })
  .withCustomTranslations({
    vi: {
      loginTitle: "Đăng nhập · WattPrint",
      loginAccountTitle: "Đăng nhập bằng email",
      loginAccountSubtitle: "Dùng email và mật khẩu của tài khoản WattPrint.",
      registerTitle: "Tạo tài khoản",
      registerSubtitle: "Theo dõi điện năng của gia đình bạn với WattPrint.",
      haveAccount: "Đã có tài khoản?",
      rememberedPassword: "Nhớ ra mật khẩu?",
      passwordMinLength: "Tối thiểu {0} ký tự.",
      sendResetLink: "Gửi liên kết đặt lại",
      backToLogin: "Quay lại đăng nhập",
      emailInstruction: "Nhập email tài khoản, chúng tôi sẽ gửi liên kết để đặt mật khẩu mới.",
      pitchTitle: "Tiếp tục từ nơi bạn dừng lại.",
      pitchBody: "Bảng điều khiển năng lượng của bạn, chỉ một cú nhấp.",
      goHome: "Về trang chủ",
      orContinueWith: "hoặc",
      continueWithGoogle: "Tiếp tục với Google",
      termsLead: "Khi tiếp tục, bạn đồng ý với",
      termsOfService: "Điều khoản dịch vụ",
      termsAnd: "và",
      privacyPolicy: "Chính sách quyền riêng tư",
      languageLabel: "Ngôn ngữ",
    },
    en: {
      loginTitle: "Sign in · WattPrint",
      loginAccountTitle: "Sign in with email",
      loginAccountSubtitle:
        "Use the email and password of your WattPrint account.",
      registerTitle: "Create your account",
      registerSubtitle: "Track your home's electricity with WattPrint.",
      haveAccount: "Already have an account?",
      rememberedPassword: "Remembered your password?",
      passwordMinLength: "At least {0} characters.",
      sendResetLink: "Send reset link",
      backToLogin: "Back to sign in",
      emailInstruction: "Enter your account email and we'll send you a link to set a new password.",
      pitchTitle: "Pick up where you left off.",
      pitchBody: "Your energy dashboard, one click away.",
      goHome: "Go to home page",
      orContinueWith: "or",
      continueWithGoogle: "Continue with Google",
      termsLead: "By continuing, you agree to the",
      termsOfService: "Terms of Service",
      termsAnd: "and",
      privacyPolicy: "Privacy Policy",
      languageLabel: "Language",
    },
  })
  .build()

type I18n = typeof ofTypeI18n

export { useI18n, type I18n }
