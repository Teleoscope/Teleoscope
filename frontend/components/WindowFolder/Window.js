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
import { useAppDispatch } from '../../hooks';
import { setDraggable } from '../../actions/windows';

export default React.forwardRef(({ ...props }) => {
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


    
    const [dragging, setDragging] = React.useState(false);
    const setDrag = (drag) => {
        if (dragging) {
            dispatch(setDraggable({ id: `${props.id}`, draggable: true }));
        } else {
            dispatch(setDraggable({ id: `${props.id}`, draggable: drag }));
        }
    };


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
            onMouseDown={() => setDragging(true)}
            onMouseUp={() => setDragging(false)}
            onMouseEnter={() => setDrag(true)}

        >
                <WindowTopBar
                    title={props.title}
                    id={props.id}
                    icon={props.icon}
                    isChecked={w.isChecked}

                /></CardActionArea>
                <div onMouseEnter={() => setDrag(false)} onMouseLeave={() => setDrag(true)}>
                    {props.inner}
                </div>
        </Card>
    )
})    