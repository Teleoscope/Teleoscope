import styled from 'styled-components';

// Component Imports
import Notes from "./Notes"
import WorkspaceItem from "../components/WorkspaceItem";
import Teleoscope from "./Teleoscope"
import Search from "../components/Search";
import GroupPalette from "../components/GroupPalette";
import Group from "../components/Group";

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
