// Window.js
import React, { useState } from "react";

// custom
import WindowTopBar from "./WindowTopBar";

// mui
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';

// actions
import { useDispatch } from "react-redux";
import { minimizeWindow, maximizeWindow, checkWindow, removeWindow } from "../../actions/windows";

export default React.forwardRef(({ ...props }) => {
    const [show, setShow] = useState(props.showWindow);
    const [drag, setDrag] = useState(true);
    const w = props.windata;
    const dispatch = useDispatch();
    


    const handleSelect = (e) => {
        if (e.shiftKey) {
            dispatch(checkWindow({ i: w.i, check: !w.isChecked }))
        }
    }

    const handleDelete = () => {
        dispatch(removeWindow(props.id));
    }


    if (props.size.height < 35) {
        return (
            <Chip
                label={props.title}
                icon={props.icon}
                clickable
                onDelete={handleDelete}
                className="drag-handle"
                sx={{
                    border: w.isChecked ? `2px solid ${props.color}` : "1px solid #DDDDDD",
                    boxShadow: '1',
                    cursor: "move",
                    backgroundColor: "white",
                    width: props.size.width,
                    [`& .MuiChip-icon`]: {
                        color: props.color
                      }
                }}
            />
        )
    }

    return (
        <Card
            variant="outlined"
            style={{
                borderColor: w.isChecked ? props.color : "#DDDDDD",
                borderWidth: w.isChecked ? 2 : 1,
                backgroundColor: "white",
                height: "100%",
            }}
            sx={{
                boxShadow: '1',
            }}
        ><CardActionArea
            onClick={(e) => handleSelect(e)}
        >
                <WindowTopBar
                    title={props.title}
                    id={props.id}
                    icon={props.icon}
                    isChecked={w.isChecked}
                /></CardActionArea>
            {props.inner}
        </Card>
    )
})    