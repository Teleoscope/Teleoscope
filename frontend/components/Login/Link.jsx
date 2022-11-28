// A custom link component that wraps the Next.js link component
// to make it work more like the standard link component from React Router
import NextLink from 'next/link';

export { Link };

function Link({ href, children, ...props }) {
  return (
   // requires the a tag
   <NextLink href={href}>
      <a {...props}>
         {children}
      </a>
   </NextLink>
  )
}
