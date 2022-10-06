import React, { useState, useContext } from 'react'

// mui imports
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { IconButton } from '@mui/material';

// actions
import { useDispatch } from "react-redux";
import { login } from "../../actions/logins"

// contexts
import { StompContext } from '../../context/StompContext'

// utils
import { add_login } from "../Stomp.js";

export { LoginForm };

function LoginForm({ Login, setRegistration, error }) {
   const [details, setDetails] = useState({ name: '', email: '', password: '' });
   const [passwordVisibility, setPasswordVisibility] = useState(false);

   const client = useContext(StompContext);
   const dispatch = useDispatch();

   const submitHandler = e => {
      e.preventDefault()

      // dispatches the login details to login store
      dispatch(login(details))
      
      // sends the information to Stomp.js
      add_login(client, details.email, details.password)

      Login(details)
   }
   return (
      <div 
      style={{
         display: 'flex',
         alignItems: 'baseline',
         justifyContent: 'center',
       }}>
         <form onSubmit={submitHandler}>
            <div class="form-inner">
               <h2>Teleoscope Login</h2>
               {/* Error here */}
               {/* <div className='form-group'>
            <label htmlFor='name'>Name:</label>
            <input type="text" name='name' id='name' onChange={e => setDetails({...details, name: e.target.value})} value = {details.name}/>
         </div> */}
               <div className='form-group'>
                  <label htmlFor='email'>Email:</label>
                  <input type='email' name='email' id='email' onChange={e => setDetails({ ...details, email: e.target.value })} value={details.email} />
               </div>
               <div className='form-group'>
                  <label htmlFor='password'>Password:</label>
                  <input type={passwordVisibility ? "text" : "password"} name='password' id='password' onChange={e => setDetails({ ...details, password: e.target.value })} value={details.password} />
                  <IconButton>
                     {passwordVisibility ?
                        <VisibilityIcon onClick={() => setPasswordVisibility(!passwordVisibility)} /> :
                        <VisibilityOffIcon onClick={() => setPasswordVisibility(!passwordVisibility)} />}
                  </IconButton>
               </div>
               <input type='submit' value='LOGIN' />
            </div>
         </form>
         <div>
            <button onClick={() => setRegistration()}>REGISTER</button>
         </div>
      </div>
   )
}
