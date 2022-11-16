import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import useSWRAbstract from '../../util/swr'
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

import { Link } from '../../components/Login/Link';
import { Layout } from '../../components/Login/Layout/Layout';
import { add_login } from '../../components/Stomp';
import { alertService } from '../../services/index';
import { authenticateService } from '../../services/authenticate.service';
import { validateConfig } from 'next/dist/server/config-shared';

export default Login;

function Login() {
   const router = useRouter();
   const [validUser, setValidUser] = useState("");
   const [username, setUsername] = useState("");
   const { user } = useSWRAbstract("user", `/api/authenticate/${username}`);

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
      console.log("user", user)
      setValidUser(authenticateService.authenticateHash(user, username, password));
      router.push(validUser);

      add_login(username, password).then(() => {
         const returnURL = router.query.returnURL || '/';
         router.push(returnURL);
      })
      .catch(alertService.error);

   }

   return (
      <Layout>
         <div className='card'>
            <h4 className='card-header'>Login</h4>
            <div className='card-body'>
               <form onSubmit={handleSubmit(onSubmit)}>
                  <div className='form-group'>
                     <label>Username</label>
                     <input name="username" type="text" {...register('username')} className={`form-control ${errors.username ? 'is-invalid' : ''}`}  onChange={e => setUsername(e.target.value)}/>
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