import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiTextField-root': {
      // margin: theme.spacing(1),
      width: '25ch',
    },
  },
}));

export default function MultilineTextFields(props) {
  const classes = useStyles();
  const [value, setValue] = React.useState('Enter notes...');

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  return (
    props.show ?
    <form className={classes.root} noValidate autoComplete="off">
        <TextField
          id="standard-multiline-flexible"
          // label="Notes"
          multiline
          // rowsMax={4}
          value={value}
          onChange={handleChange}
        />
    </form> : null
  );
}