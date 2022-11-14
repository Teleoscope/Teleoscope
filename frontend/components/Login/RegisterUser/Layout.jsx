import React from 'react'
export { Layout };
function Layout({children}) {

   // wraps the children in some bootstrap classes to se
   // the width, padding and alignment of all of the users 
   // pages
  return (
    <div className='p-4'>
      <div className='container'>
         {children}
      </div>
   </div>
  )
}
