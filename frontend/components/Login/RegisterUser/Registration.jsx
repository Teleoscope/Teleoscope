import React, { useContext } from "react";
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

// custom components
import { Link } from '../Link'
import { Layout } from '../Layout/Layout'
import { register_account } from '../../Stomp';

// contexts
import { StompContext } from '../../../context/StompContext';

export default Registration;

function Registration() {
    const client = useContext(StompContext);
    const router = useRouter();

    // form validation rules 
    const validationSchema = Yup.object().shape({
        firstName: Yup.string()
            .required('First Name is required'),
        lastName: Yup.string()
            .required('Last Name is required'),
        username: Yup.string()
            .required('Username is required'),
        password: Yup.string()
            .required('Password is required')
            .min(6, 'Password must be at least 6 characters')
    });
    const formOptions = { resolver: yupResolver(validationSchema) };

    // get functions to build form with useForm() hook
    const { register, handleSubmit, formState } = useForm(formOptions);
    const { errors } = formState;

    function onSubmit(user) {
        console.log("Client", client);
        register_account(client, user);
        router.push('login');
    }

   return (
      <Layout>
         <div className="card">
            <h4 className="card-header">Register</h4>
            <div className="card-body">
               <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="form-group">
                     <label>First Name</label>
                     <input name="firstName" type="text" {...register('firstName')} className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} />
                     <div className="invalid-feedback">{errors.firstName?.message}</div>
                  </div>
                  <div className="form-group">
                     <label>Last Name</label>
                     <input name="lastName" type="text" {...register('lastName')} className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} />
                     <div className="invalid-feedback">{errors.lastName?.message}</div>
                  </div>
                  <div className="form-group">
                     <label>Username</label>
                     <input name="username" type="text" {...register('username')} className={`form-control ${errors.username ? 'is-invalid' : ''}`} />
                     <div className="invalid-feedback">{errors.username?.message}</div>
                  </div>
                  <div className="form-group">
                     <label>Password</label>
                     <input name="password" type="password" {...register('password')} className={`form-control ${errors.password ? 'is-invalid' : ''}`} />
                     <div className="invalid-feedback">{errors.password?.message}</div>
                  </div>
                  <button disabled={formState.isSubmitting} className="btn btn-primary">
                     {formState.isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
                     Register
                  </button>
                  <Link href="/account/login" className="btn btn-link">Cancel</Link>
               </form>
            </div>
         </div>
      </Layout>
   )
}
