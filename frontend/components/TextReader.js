import React from 'react';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import TextAction from "../components/TextAction";

const useStyles = makeStyles({
  root: {
    width: '100%',
    maxWidth: 500,
  },
});

export default function Types(props) {
  const classes = useStyles();
  var text = props.text.split(/[\s]/)
  var text_match = [...props.text.matchAll(/([a-zA-Z']+)|([\.,\s])/g)]
  // console.log(text_match)

  return (
    <div className={classes.root}>
      <Typography variant="body2" color="textSecondary" component="p">
        {text.map((word, i)=>(
          <TextAction 
            word={word} 
            key={word + i}
          />))
        }
      </Typography>
    </div>
  );
}