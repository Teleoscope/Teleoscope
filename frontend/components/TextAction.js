import React from 'react';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  root: {
    '&:hover': {
       background: "#ffff00",
       border: "1px solid #ffff00"
    },
    // width: '100%',
    // maxWidth: 500,
  },
});

export default function Types(props) {
  const classes = useStyles();

  return (
    <span><span className={classes.root}>
      {props.word}
    </span> </span>
  );
}