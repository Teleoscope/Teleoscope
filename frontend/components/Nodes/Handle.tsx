import { Handle } from "reactflow";
import { useAppSelector, useAppDispatch } from "@/util/hooks";

export default function HandleWrapper({ type, id, position }) {
    const settings = useAppSelector((state) => state.windows.settings);

    const style = {
        width: "8px",
        height: "8px",
        borderRadius: "3px",
        backgroundColor: settings.color,
    }
    return (
        <Handle type={type} id={id} position={position} style={style} />
    )
}
