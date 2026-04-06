import {
  CheckCircle2 as CircleCheck,
  Info,
  Loader2 as LoaderCircle,
  XOctagon as OctagonX,
  AlertTriangle as TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      richColors
      closeButton={false}
      position="top-right"
      expand={false}
      visibleToasts={3}
      gap={10}
      offset={20}
      duration={3200}
      theme={theme as ToasterProps["theme"]}
      className="toaster group print:hidden"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:w-[360px] group-[.toaster]:rounded-2xl group-[.toaster]:border-slate-200 group-[.toaster]:bg-white/95 group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:text-slate-900 group-[.toaster]:shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-md",
          title: "text-sm font-semibold tracking-tight text-slate-900",
          description: "group-[.toast]:text-[13px] group-[.toast]:text-slate-500",
          icon: "text-current",
          actionButton:
            "group-[.toast]:rounded-xl group-[.toast]:bg-slate-900 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:rounded-xl group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
