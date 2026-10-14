import type { Telemetry } from '@inv/contracts'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { electronicsInfo } from '@/content/electronics'
import type { InfoKey } from '@/content/electronics/types'
import { InfoTabs } from '@/features/electronics/InfoTabs'
import { useMediaQuery } from '@/lib/use-media-query'

const DESKTOP_QUERY = '(min-width: 1024px)'

interface InfoElectronicaDrawerProps {
  infoKey: InfoKey | null
  frame: Telemetry | null
  onClose: () => void
}

/** Panel Info Electrónica: Drawer inferior en móvil, Sheet lateral en escritorio. */
export function InfoElectronicaDrawer({ infoKey, frame, onClose }: InfoElectronicaDrawerProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const info = infoKey ? electronicsInfo[infoKey] : null
  const open = info !== null
  const onOpenChange = (next: boolean) => {
    if (!next) onClose()
  }
  const description = 'Cómo la electrónica convierte esta magnitud en el dato que ves.'

  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-copper">{info?.title ?? 'Info Electrónica'}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{info && <InfoTabs info={info} frame={frame} />}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        <DrawerHeader>
          <DrawerTitle className="text-copper">{info?.title ?? 'Info Electrónica'}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-w-0 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {info && <InfoTabs info={info} frame={frame} />}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
