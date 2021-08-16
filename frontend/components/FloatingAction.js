import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import NavigationIcon from "@material-ui/icons/Navigation";
import Draggable from "react-draggable";

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
}));

export default function FloatingActionButtonSize() {
  const classes = useStyles();

  return (
    <Draggable grid={[20, 20]} bounds="parent">
      <div>
        <div>
          <Fab
            size="small"
            color="secondary"
            aria-label="add"
            className={classes.margin}
          >
            <AddIcon />
          </Fab>
        </div>
      </div>
    </Draggable>
  );
}
