import { useRouter } from 'next/router';
import PropTypes from 'prop-types';

// import { Link } from './Link';
import { Link } from 'components/Login';

NavLink.propTypes = {
   href: PropTypes.string.isRequired,
   exact: PropTypes.bool
};

NavLink.defaultProps = {
   exact: false
};

export { NavLink };

function NavLink({children, href, exact, ...props}) {
   const { pathname } = useRouter();
   const isActive = exact ? pathname === href : pathname.startsWith(href);
   
   if (isActive) {
       props.className += ' active';
   }

   return <Link href={href} {...props}>{children}</Link>;
}
