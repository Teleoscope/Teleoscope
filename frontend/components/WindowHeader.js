import styled from 'styled-components';

// header does not scroll, but we can have the style here 
const WindowHeaderStyle = styled.div` 
`;


export const WindowHeader = ({ children }) => {
   const header = children;
   return (
      // returns the header of whatever is being displayed
      <WindowHeaderStyle>
         {header}
      </WindowHeaderStyle>
   )
}