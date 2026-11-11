import { Alert } from "@workspace/ui/components/hairline/alert"

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <Alert tone="danger" title={message} />
}
