import styled from 'styled-components';

// Component Imports
import Notes from "../WindowModules/Notes"
import WorkspaceItem from "../WorkspaceItem";
import Teleoscope from "../WindowModules/Teleoscope"
import Search from "../WindowModules/Search";
import GroupPalette from "../WindowModules/GroupPalette";
import Group from "../Group";

// styling for the window body 
const WindowBodyStyle = styled.div` 
  overflow: auto;
  height: 67.5%;
`;

export const WindowBody = ({ children }) => {
  const body = children;
  return (
    <WindowBodyStyle>
      {body}
    </WindowBodyStyle>
  )
}
