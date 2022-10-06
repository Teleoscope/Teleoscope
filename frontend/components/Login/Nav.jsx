import { useState, useEffect } from 'react';

//import { NavLink } from './NavLink';
import { NavLink } from 'components/Login';
import { userService } from 'services';
//import { userService } from '../../services/user.service';

export { Nav };

function Nav() {
   const [user, setUser] = useState(null);

   useEffect(() => {
      const subscription = userService.user.subscribe(x => setUser(x));
      return () => subscription.unsubscribe();
   }, []);

   function logout() {
      userService.logout();
   }

   // only show nav when logged in
   if (!user) return null;

  return (
   <nav className="navbar navbar-expand navbar-dark bg-dark">
      <div className="navbar-nav">
         <NavLink href="/" exact className="nav-item nav-link">Home</NavLink>
         <NavLink href="/users" className="nav-item nav-link">Users</NavLink>
         <a onClick={logout} className="nav-item nav-link">Logout</a>
      </div>
   </nav>
  )
}
