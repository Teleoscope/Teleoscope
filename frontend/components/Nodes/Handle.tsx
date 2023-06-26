import { Handle } from "reactflow";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { renderToString } from 'react-dom/server';
import { BsArrowRightCircleFill } from "react-icons/bs";
import { FaArrowRight } from "react-icons/fa";



export default function HandleWrapper({ type, id, position, variant }) {
    const settings = useAppSelector((state) => state.windows.settings);
    const svgString = renderToString(
        <FaArrowRight />
    );

    const size = 6;

    const stylebase = {
        width: `${size * 2}px`,
        height: `${size * 2}px`,
        position: "fixed",
        border: `2px solid ${settings.color}`,
        borderRadius: `2px`,
        paddingLeft: `2px`,
        backgroundColor: settings.color,
        backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(svgString)}')`,
        backgroundSize: "contain",
        filter: `invert(1) hue-rotate(180deg)`,
        transition: `opacity 0.3s ease` 
    }

    const style = () => { 
        if (variant == "source") {
            return {
                transform: `translate(-100%, -125%)`,
                // left: `-${size * 2}px`,
                // top: `${size}px`,
                ...stylebase,
            }
        }

        if (variant == "control") {
            return {
                transform: `translate(-100%, 25%)`,
                // bottom: `${size}px`,
                ...stylebase,
            }
        }
        
        if (variant == "output") {
            return {
                // transform: `translate(100%, 0)`,
                right: `-${size * 3}px`,
                ...stylebase,
            }
        }

        return stylebase
    }



    return (
        <Handle type={type} id={id} position={position} style={style()} />
    )
}
