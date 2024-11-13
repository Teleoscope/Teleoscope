import { WindowConfig } from "@/components/WindowFolder/WindowDefinitions";

export default function WinIcon({ type }: {type: string}) {
    return WindowConfig[type].icon("#AAAAAA")
 }