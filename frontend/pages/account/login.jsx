import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import useSWRAbstract from '../../util/swr'
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

import { Link } from '../../components/Login/Link';
import { Layout } from '../../components/Login/Layout/Layout';
import { add_login } from '../../components/Stomp';
import { alertService } from '../../services/index';
import authenticateHash from '../../util/authenticate';
import { validateConfig } from 'next/dist/server/config-shared';

export default Login;

function Login() {
   const [username, setUsername] = useState("");
   let { user } = useSWRAbstract("user", `/api/authenticate/${username}`);
   const router = useRouter();
   const [validUser, setValidUser] = useState(false);

   useEffect(() => {
      setUsername(username)
      console.log(username)
   }, [username])
   // form validation rules
   const validationSchema = Yup.object().shape({
      username: Yup.string().required('Username is required'),
      password: Yup.string().required('Password is required')
   });

   const formOptions = { resolver: yupResolver(validationSchema) };

   // get functions to build form with useForm() hook
   const { register, handleSubmit, formState } = useForm(formOptions);
   const { errors } = formState;

   function onSubmit({ username, password }) {
      setValidUser(authenticateHash( user, username, password));


      // add_login(username, password).then(() => {
      //    const returnURL = router.query.returnURL || '/';
      //    router.push(returnURL);
      // })
      // .catch(alertService.error);

   }

   return (
      <Layout>
         <div className='card'>
            <h4 className='card-header'>Login</h4>
            <div className='card-body'>
               <form onSubmit={handleSubmit(onSubmit)}>
                  <div className='form-group'>
                     <label>Username</label>
                     <input name="username" type="text" {...register('username')} className={`form-control ${errors.username ? 'is-invalid' : ''}`}  onChange={(e) => setUsername(e.target.value)}/>
                            <div className="invalid-feedback">{errors.username?.message}</div>
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input name="password" type="password" {...register('password')} className={`form-control ${errors.password ? 'is-invalid' : ''}`} />
                            <div className="invalid-feedback">{errors.password?.message}</div>
                        </div>
                        <button disabled={formState.isSubmitting} className="btn btn-primary">
                            {formState.isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
                            Login
                        </button>
                        <Link href="/account/register" className="btn btn-link">Register</Link>
                    </form>
                </div>
            </div>
        </Layout>
   )
}

// ------------------------------------------------------------------------------------------------------------------------------------------------


// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { yupResolver } from '@hookform/resolvers/yup';
// import * as Yup from 'yup';
// import Router, { withRouter } from 'next/router';

// import { Link } from '../../components/Login/Link';
// import { Layout } from '../../components/Login/Layout/Layout';
// import verification from '../../services/authenticate.service';
// import useSWRAbstract from '../../util/swr';
// import Cookies from 'universal-cookie';

// // mui imports
// import * as React from 'react';
// import Alert from '@mui/material/Alert';
// import AlertTitle from '@mui/material/AlertTitle';

// export default withRouter(Login);

// function Login({router}) {
//    const [username, setUsername] = useState("");
//    const { user } = useSWRAbstract("user", `/api/authenticate/${username}`);
//    const [login, setLogin] = useState(false);
//    const cookies = new Cookies();

//    // form validation rules
//    const validationSchema = Yup.object().shape({
//       username: Yup.string().required('Username is required'),
//       password: Yup.string().required('Password is required')
//    });

//    const formOptions = { resolver: yupResolver(validationSchema) };

//    // get functions to build form with useForm() hook
//    const { register, handleSubmit, formState } = useForm(formOptions);
//    const { errors } = formState;

//    function onSubmit({ username, password }) {
//       // add_login(username, password).then(() => {
//       //    const returnURL = router.query.returnURL || '/';
//       //    router.push(returnURL);
//       // })
//       // .catch(alertService.error);
//       //setUsername(username);
//       //console.log("Login User", user.username);

//       setLogin(verification(username, password, user));
//       console.log('Login', login)
//       if (login) {
//          cookies.set("authorized", "true", {path: '/'});
//          Router.push('/');
//       } else {
//          cookies.set("authorized", "false", {path: '/'});
//       }
//       // return userService.login(username, password).then(() => {
//       //    // get return url from query parameters or default to '/'
//       //    const returnURL = router.query.returnURL || '/';
//       //    router.push(returnURL);
//       // })
//       // .catch(alertService.error);

//    }

//    return (
//       <>
//          <Layout>
//             <div className='card'>
//                <h4 className='card-header'>Login</h4>
//                <div className='card-body'>
//                   <form onSubmit={handleSubmit(onSubmit)}>
//                      <div className='form-group'>
//                         <label>Username</label>
//                         <input name="username" type="text" {...register('username')} className={`form-control ${errors.username ? 'is-invalid' : ''}`} onChange={(e) => setUsername(e.target.value)} />
//                         <div className="invalid-feedback">{errors.username?.message}</div>
//                      </div>
//                      <div className="form-group">
//                         <label>Password</label>
//                         <input name="password" type="password" {...register('password')} className={`form-control ${errors.password ? 'is-invalid' : ''}`} />
//                         <div className="invalid-feedback">{errors.password?.message}</div>
//                      </div>
//                      <button disabled={formState.isSubmitting} className="btn btn-primary">
//                         {formState.isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
//                         Login
//                      </button>
//                      <Link href="/account/register" className="btn btn-link">Register</Link>
//                   </form>
//                </div>
//             </div>
//          </Layout>
//          {router.query.error === "true" ?
//             <Alert severity="error">
//                <AlertTitle>Error</AlertTitle>
//                This is an error alert — <strong>check it out!</strong>
//             </Alert> : null
//          }
//       </>
//    )
// }