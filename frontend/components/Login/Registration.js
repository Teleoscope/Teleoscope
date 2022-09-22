import React, { useState } from 'react'

//mui
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { IconButton } from '@mui/material';

// actions
//import { useDispatch } from "react-redux";

export default function Registration(props) {

   const [details, setDetails] = useState({ name: '', email: '', password: '' });
   const [passwordVisibility, setPasswordVisibility] = useState(false);
   //const dispatch = useDispatch();

   const submitHandler = e => {
      e.preventDefault()

      console.log("Account Registered")
   }


   return (
      <div>
         {/* // when the form is sumbitted the user information
         // will be sent to the registration reducer */}
         <form onSubmit={submitHandler}>
            <h2>Teleoscope Account Registration</h2>
            <div className='form-group'>
               <label htmlFor='name'>Name:</label>
               <input type="text" name='registration-name' id='registration-name' onChange={e => setDetails({ ...details, name: e.target.value })} value={details.name} />
            </div>
            <div className='form-group'>
               <label htmlFor='email'>Email:</label>
               <input type='email' name='registration-email' id='registration-email' onChange={e => setDetails({ ...details, email: e.target.value })} value={details.email} />
            </div>
            <div className='form-group'>
               <label htmlFor='password'>Password:</label>
               <input type={passwordVisibility ? "text" : "password"} name='registration-password' id='registration-password' onChange={e => setDetails({ ...details, password: e.target.value })} value={details.password} />
               <IconButton>
                  {passwordVisibility ? 
                     <VisibilityIcon onClick={() => setPasswordVisibility(!passwordVisibility)} /> : 
                     <VisibilityOffIcon onClick={() => setPasswordVisibility(!passwordVisibility)} />}
               </IconButton>

            </div>
            <input type='submit' value='REGISTER' />
         </form >
         <button onClick={() => props.setRegistration()}>BACK</button>
      </div>
   )
}
