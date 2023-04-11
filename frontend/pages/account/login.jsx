import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { Link } from '../../components/Login/Link';
import { Layout } from '../../components/Login/Layout/Layout';
import authenticateHash from '../../util/authenticate';
import { Stomp } from '../../components/Stomp';
import { useCookies } from "react-cookie";
import bcrypt from 'bcryptjs';

export default Login;

function Login() {
   const [username, setUsername] = useState("");
   const router = useRouter();
   const [validUser, setValidUser] = useState(false);
   const [cookies, setCookie] = useCookies(['token']);

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
      fetch(`${process.env.NEXT_PUBLIC_AUTH_SERVER}/salt`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify({
            username: username
         })
      })
      .then(response => {
         if (response.ok) {
            response.json().then(salt => {
               // create a POST request to the backend auth server
               fetch(`${process.env.NEXT_PUBLIC_AUTH_SERVER}/login`, {
                  method: 'POST',
                  headers: {
                     'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                     username: username,
                     password: bcrypt.hashSync(password, salt)
                  })
               })
               .then(response => {
                  if (response.ok) {
                     // if log in is successful, store the token in a cookie and route to workspace
                     response.json().then(info => {
                        setCookie('userid', info['userid'], {path: '/'});
                        setCookie('user', username, {path: '/'});
                        setCookie('token', info['token'], {path: '/'});
                        router.push('/');
                     });
                  } else {
                     // if log in failed, alert relate error message and let the user re-login.
                     router.push('/account/login');
                     response.json().then(msg => {
                        alert(msg); //TODO: show it on <div>
                     });
                  }
               })
               .catch(error => {
                  router.push('/account/login');
                  alert(error); // show it on <div>
               });
            });
         } else {
            // if log in failed, alert relate error message and let the user re-login.
            router.push('/account/login');
            response.json().then(msg => {
               alert(msg); //TODO: show it on <div>
            });
         }
      })
      .catch(error => {
         router.push('/account/login');
         alert(error); // show it on <div>
      });
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

//       setLogin(verification(username, password, user));
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