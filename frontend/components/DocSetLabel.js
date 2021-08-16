import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: 3,

    '& > *': {
      margin: theme.spacing(1),
      width: '25ch',
    },
    '& .MuiFilledInput-input': {
      // backgroundColor: 'lightblue',
      // border: '1px solid red',
      padding: "2px 2px 0 4px",
      // marginBottom:"50px"
    }
  },
  textField: {
        // width: '100%',
        // height:'10%',
        // marginLeft: 'auto',
        // marginRight: /'auto',            
        // paddingBottom: 0,
        marginTop: 4,
        // fontWeight: 500
    },
    input: {
      height:'20px',
      // padding: "0px 0px 0px 0px !important"
      // paddingTop:'0px',
      // baselineShift:

        // color: 'white'
    },
    overrides: {
        MuiInputBase: {
          input: {
            padding: 0,
          }
    }
  }
}));

export default function BasicTextFields(props) {
  const classes = useStyles();


  return (
    props.label.length > 0 ? <div className={classes.root}>{props.label}</div> : 
    <form className={classes.root} noValidate autoComplete="off">
      <TextField 
        className={classes.textField}
        id="filled-basic" 
        variant="filled"
        // size="small"
        // margin="dense"
            InputProps={{
        className: classes.input,
    }}
      />
    </form>
  );
}