import { useEffect } from 'react';
import { useRouter } from 'next/router';

import { userService } from 'services';

export { Layout };

// The layout component contains common layout code for
// all pages {Login and Register}
function Layout({ children }) {
   const router = useRouter();

   // takes the user back to home page if they are already logged in 
   useEffect(() => {
      if (userService.userValue) {
         router.push('/');
      }
   }, []);
  return (
   // change class name to something more readable
   <div className='col-md-6 offset-md-3 mt-5'>
      {children}
   </div>
  )
}
