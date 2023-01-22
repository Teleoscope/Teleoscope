import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

/*
Yup is a schema builder for runtime value parsing and validation. 
Define a schema, transform a value to match, assert the shape of an 
existing value, or both. Yup schema are extremely expressive and allow 
modeling complex, interdependent validations, or value transformation.
*/

//import { Link } from '../Login';
import { Link } from 'components/Login'
import { userService, alertService } from 'services';
//import { createStructuredSelector } from 'reselect';

//import { alertService } from '../../../services/alert.service';
//import { userService } from '../../../services/user.service';

export { AddEdit };
function AddEdit(props) {
   const user = props?.user;
   const isAddMode = !user;
   const router = useRouter();

   // form validation checks
   const validationSchema = Yup.object().shape({
      firstName: Yup.string()
         .required('First Name is required'),
      lastName: Yup.string()
         .required('Last Name is required'),
      username: Yup.string()
         .required('Username is required'),
      password: Yup.string()
         .transform(x => x === '' ? undefined : x)
         .concat(isAddMode ? Yup.string().required('Password is required') : null)
         .min(6, 'Password must be at least 6 characters')

   });

   // putting to use the validation checks
   const formOptions = { resolver: yupResolver(validationSchema) };

   // if in edit mode, set the form to default vals
   if (!isAddMode) {
      formOptions.defaultValues = props.user
   }

   // get functions to build form with useForm() hook
   // useForm() hook returns an object with methods for working
   // with a form including registering inputs, handling form submit,
   // resetting the form, accesing form state, and displaying errors
   const { register, handleSubmit, reset, formState } = useForm(formOptions);
   const { errors } = formState;

   // Either creates or updates a user depending on which mode they're in
   function onSubmit(data) {
      return isAddMode ? createUser(data) : updateUser(user.id, data)
   }

   function createUser(data) {
      return userService.register(data).then(() => {
         alertService.success('User added', { keepAfterRouteChange: true });
         router.push('.');
      })
         .catch(alertService.error);
   }

   function updateUser(id, data) {
      return userService.update(id, data).then(() => {
         alertService.success('User updated', { keepAfterRouteChange: true });
         router.push('..');
      })
         .catch(alertService.error)
   }

   return (
      <form onSubmit={handleSubmit(onSubmit)}>
         <div className='form-row'>
            <div className="form-group col">
               <label>First Name</label>
               <input name="firstName" type="text" {...register('firstName')} className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} />
               <div className="invalid-feedback">{errors.firstName?.message}</div>
            </div>
            <div className="form-group col">
               <label>Last Name</label>
               <input name="lastName" type="text" {...register('lastName')} className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} />
               <div className="invalid-feedback">{errors.lastName?.message}</div>
            </div>
         </div>
         <div className="form-row">
            <div className="form-group col">
               <label>Username</label>
               <input name="username" type="text" {...register('username')} className={`form-control ${errors.username ? 'is-invalid' : ''}`} />
               <div className="invalid-feedback">{errors.email?.message}</div>
            </div>
            <div className="form-group col">
               <label>
                  Password
                  {!isAddMode && <em className="ml-1">(Leave blank to keep the same password)</em>}
               </label>
               <input name="password" type="password" {...register('password')} className={`form-control ${errors.password ? 'is-invalid' : ''}`} />
               <div className="invalid-feedback">{errors.password?.message}</div>
            </div>
         </div>
         <div className="form-group">
            <button type="submit" disabled={formState.isSubmitting} className="btn btn-primary mr-2">
               {formState.isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
               Save
            </button>
            <button onClick={() => reset(formOptions.defaultValues)} type="button" disabled={formState.isSubmitting} className="btn btn-secondary">Reset</button>
            <Link href="/users" className="btn btn-link">Cancel</Link>
         </div>
      </form>
   )
}
