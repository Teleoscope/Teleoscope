import { Button, Chip, Divider, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Snackbar, TextField } from "@mui/material";
import { Stack, Typography } from "@mui/material";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import space from 'color-space';
import rgbHex from 'rgb-hex';
import themeConfig from "theme.config";
import CloseIcon from '@mui/icons-material/Close';



const fetcher = (...args) => fetch(...args).then(res => res.json())

const ExistingWorkspace = ({workspace, color}) => {

    // Use window.location to determine the host dynamically
    // const protocol = window.location.protocol;
    // const host = window.location.host; // Includes hostname and port if applicable

    const [contributor, setContributor] = useState("");    
    const { data: coll } = useSWR(`/api/users/${contributor}`, fetcher)
    const [open, setOpen] = useState(false);

    const handleTextChange = (event, ws) => {
        setContributor(event.target.value)   
    }


    const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
          return;
        }
    
        setOpen(false);
      };



    const action = (
        <>
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      );
    
    const handleDelete = (c) => {
        fetch(`/api/contributors/remove`, {
            method: 'POST',
            body: JSON.stringify({contributor_id: c, workspace_id: workspace["_id"]}),
            headers: { "Content-Type": "application/json" }
        })
    }

    const handleKeyDown = (event) => {
        if ((event.key === 'Return' || event.key === 'Enter' || event.keyCode === 13) && coll?.found) {
            setOpen(true)
            fetch(`/api/contributors/add`, {
                method: 'POST',
                body: JSON.stringify({contributor: contributor, workspace_id: workspace["_id"]}),
                headers: { "Content-Type": "application/json" }
            })
        }
    }

    return (
        <Paper elevation={1} sx={{width:"12em"}}>
            <Stack spacing={2} sx={{margin: "1em"}}>
            <Typography variant="h6">{workspace.label}</Typography>
            <Divider></Divider>
            <Typography variant="subtitle2">Collaborators</Typography>
            {workspace?.contributors?.map(c => {
                return <Chip label={c.username} onDelete={() => handleDelete(c.id)}/>
            })}
            <FormControl fullWidth>
                <TextField 
                    id="outlined-basic" 
                    label="Add contributor" 
                    variant="outlined"
                    size="small"
                    onKeyDown={handleKeyDown}
                    onChange={(event) => handleTextChange(event, workspace)}
                />
            </FormControl>
            <Button sx={{color: color}}><a href={`/workspace/${workspace._id}`} >Select workspace</a></Button>
            </Stack>
            <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={handleClose}
            message="Adding collaborator to workspace. This might take a few seconds."
            action={action}
        />
        </Paper>
    )
}

const NewWorkspace = ({color}) => {
    const [newWorkspaceSource, setNewWorkspaceSource] = useState("blank");
    const [label, setLabel] = useState("");
    const [labelError, setLabelError] = useState("");
    const [open, setOpen] = useState(false);


    const handleChange = (event) => {
        setNewWorkspaceSource(event?.target.value)
    }

    const handleLabelChange = (event) => {
        validateLabel()
        setLabel(event.target.value)
    }

    const handleClick = () => {
        
        if (!validateLabel()) {
            fetch(`/api/workspace`, {
                method: 'POST',
                body: JSON.stringify({label: label, datasource: newWorkspaceSource}),
                headers: { "Content-Type": "application/json" }
            })
            setOpen(true)
        }
    }

    const validateLabel = () => {
        const label_length = 3;
        if (label.length < label_length) {
            setLabelError(`Label must be at least ${label_length} characters long.`);
            return true
          }
          else {
            setLabelError('');
            return false
          }
    }

    
      const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
          return;
        }
    
        setOpen(false);
      };



    const action = (
        <>
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      );
    

    return (

    <Paper elevation={1} sx={{width:"12em"}}>
                <Stack spacing={2} sx={{margin: "1em"}}>
                    <TextField 
                        id="outlined-basic" 
                        label="Workspace label" 
                        variant="outlined" 
                        onChange={handleLabelChange} 
                        size="small"
                        InputLabelProps={{
                            sx: { "&.Mui-focused": { color: color } },
                        }}
                        sx={{
                            width: "100%",
                            margin: 1,
                            "& .MuiInput-underline:after": { borderBottomColor: color },
                        }}
                        onBlur={validateLabel}
                        error={!!labelError}
                        helperText={labelError}
                    />
                    <Divider></Divider>
                    <FormControl>
                        <InputLabel id="demo-simple-select-label">Data source</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={newWorkspaceSource}
                            label="Data source"
                            onChange={handleChange}
                            size="small"
                        >   <MenuItem value={"blank"}>Blank</MenuItem>
                            <MenuItem value={"nursing"}>r/nursing</MenuItem>
                            <MenuItem value={"aita"}>r/AmITheAsshole</MenuItem>
                        </Select>                    
                    </FormControl>
                    <Button onClick={handleClick} sx={{color: color}}>Add new workspace</Button>
                    </Stack>
                    {/* <Button onClick={handleClick}>Open simple snackbar</Button> */}
        <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={handleClose}
            message="Creating new workspace. May take a few seconds."
            action={action}
        />
    </Paper>
    )
    
}

const Workspaces = ({workspaces, color}) => {
    return (
        <Stack spacing={2} sx={{height: "100%", padding: "1em", overflow: "auto"}}>
            <Typography>Workspaces</Typography>
        
            <Stack sx={{margin: "0.5em"}} spacing={2} direction="row">

                <NewWorkspace color={color} />
                {workspaces?.map(ws => <ExistingWorkspace workspace={ws} color={color} ></ExistingWorkspace>)}
            </Stack>
        </Stack>
    )

}




export default function Dashboard() {
    const { data: session, status } = useSession();
    const { data: user, error } = useSWR(`/api/user/${session?.user?.id}`, fetcher);
    
    const { data: workspaces } = useSWR(`/api/workspaces`, fetcher)

    if (error || status != "authenticated" || !session) {
        return <div>Looks like you forgot to sign in. <Link href="/">Click here to return to the home page.</Link></div>
    }

    const rgb = space.hsl.rgb([themeConfig.primaryHue, 100, 50])
    const color = `#${rgbHex(rgb[0], rgb[1], rgb[2])}`
    const linkstyle = {
        color: color
    }

    
   

    return (
        <Stack spacing={2} sx={{margin: "2em"}}>
            <Stack direction="row" justifyContent="space-between" >
                <Typography variant="h4">Welcome, {user?.username}.</Typography>
                <Button onClick={() => signOut({ callbackUrl: `/` })}>Sign out</Button>
            </Stack>
            <Typography variant="h5">Start by creating a new workspace or accessing a previous one. </Typography>
            <Typography>For now, we have two data sources from <Link style={linkstyle} href={"https://reddit.com"}>Reddit</Link> that are loaded and open to use: <Link style={linkstyle} href={"https://reddit.com/r/nursing"}>r/nursing</Link> and <Link style={linkstyle} href={"https://reddit.com/r/AmITheAsshole"}>r/AmITheAsshole</Link>. When you create a new workspace, you 
            will get to choose which you would like to use as your data source. You can also add contributors by username below.</Typography>
            <Typography variant="caption">If you'd like a different subreddit as a data source,
            please email us at <Link style={linkstyle} href="mailto:hello@teleoscope.ca">hello@teleoscope.ca</Link> and we may be able to accommodate 
            your request. Subreddits are provided courtesy of <Link style={linkstyle} href="https://pushshift.io/">pushshift.io</Link> and are up 
            to date on their schedule, which is roughly within two months.</Typography>
            
            

            <Workspaces workspaces={workspaces} color={color} />


        </Stack>
        
    )
}
