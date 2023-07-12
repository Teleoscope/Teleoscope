import { useStomp } from "@/util/Stomp";
import { Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, TextField } from "@mui/material";
import { Stack, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (...args) => fetch(...args).then(res => res.json())

const ExistingWorkspace = ({workspace, client}) => {
    const [collaborator, setCollaborator] = useState("");    
    const { data: coll } = useSWR(`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/users/${collaborator}`, fetcher)
    
    const handleTextChange = (event, ws) => {
        setCollaborator(event.target.value)
        if (event.key == 'enter' && coll?.found) {
            client.set_collaborator(event.target.value, ws)
        }
    }

    return (
        <Paper elevation={1} sx={{width:"12em"}}>
        <Stack spacing={2} sx={{margin: "1em"}}>
        <Typography variant="h6">{workspace.label}</Typography>
        <Typography variant="subtitle2">Collaborators</Typography>
        {workspace?.collaborators?.map(c => {
            return <Chip label={c.username} />
        })}
        <FormControl fullWidth>
            <TextField 
                id="outlined-basic" 
                label="Add collaborator" 
                variant="outlined" 
                onChange={(event) => handleTextChange(event, workspace)}  
                color={coll?.found ? "success" : "primary"}
            />
        </FormControl>
            <Link href={`/workspaces/${workspace._id}`} >Select workspace</Link>
        </Stack>
    </Paper>
    )

}

const Workspaces = ({workspaces, client}) => {
    const [newWorkspaceSource, setNewWorkspaceSource] = useState("aita");
    const [label, setLabel] = useState("");
    
    const handleChange = (event) => {
        setNewWorkspaceSource(event?.target.value)
    }
    const handleClick = () => {
        client.initialize_workspace(label, newWorkspaceSource)
    }


    const handleLabelChange = (event) => {
        setLabel(event.target.value)
    }

    return (
        <Stack spacing={2} sx={{height: "100%", padding: "1em", overflow: "auto"}}>
            <Typography>Workspaces</Typography>
        
            <Stack sx={{margin: "0.5em"}} spacing={2} direction="row">
        
                <Paper elevation={1} sx={{width:"12em"}}>
                <Stack spacing={2} sx={{margin: "1em"}}>
                    <TextField id="outlined-basic" label="Workspace label" variant="outlined" onChange={handleLabelChange}  />
                    <FormControl fullWidth>
                        <InputLabel id="demo-simple-select-label">Data source</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={newWorkspaceSource}
                            label="Data source"
                            onChange={handleChange}
                        >
                            <MenuItem value={"nursing"}>r/nursing</MenuItem>
                            <MenuItem value={"aita"}>r/AmITheAsshole</MenuItem>
                        </Select>                    
                    </FormControl>
                    <Button onClick={handleClick} color="primary">New workspace</Button>
                    </Stack>
                </Paper>
                {workspaces?.map(ws => <ExistingWorkspace workspace={ws} client={client}></ExistingWorkspace>)}
            </Stack>
        </Stack>
    )

}

const example_workspace = {
    id: "user?.workspaces", 
    database: "nursing", 
    label: "my workspace",
    collaborators: [
        {_id: 1234, username: "not paul"},
        {_id: 1234, username: "antipaul"},
        {_id: 1234, username: "megapaul"},
    ],
    workflows: [
        "lkasjdf"
    ]
}

export default function Dashboard() {
    const { data: session, status } = useSession();
    const { data: user, error } = useSWR(`/api/user/${session?.user?.id}`, fetcher);

    const client = useStomp()

    useEffect(() => {
        client.userId = session?.user.id;
    }, [session?.user])
    

    if (error || status != "authenticated" || !session) {
        return <div>Looks like you forgot to sign in. <Link href="/">Click here to return to the home page.</Link></div>
    }
    
    return (
        <Stack spacing={2}>
            <Typography variant="h4">Weclome, {user?.username}.</Typography>
            <Typography variant="h5">Start by creating a new workspace or accessing a previous one. </Typography>
            <Typography>For now, we have two data sources from <Link href={"https://reddit.com"}>Reddit</Link> that are loaded and open to use: <Link href={"https://reddit.com/r/nursing"}>r/nursing</Link> and 
            <Link href={"https://reddit.com/r/AmITheAsshole"}>r/AmITheAsshole</Link>. When you create a new workspace, you 
            will get to choose which you would like to use as your data source. You can also add collaborators by username here.</Typography>
            <Typography variant="caption">If you'd like a different subreddit as a data source,
            please email us at <Link href="mailto:hello@teleoscope.ca">hello@teleoscope.ca</Link> and we may be able to accommodate 
            your request. Subreddits are provided courtesy of <Link href="https://pushshift.io/">pushshift.io/</Link> and are up 
            to date on their schedule, which is roughly within two months.</Typography>
            
            <Workspaces workspaces={[example_workspace ]} client={client}/>
        </Stack>
        
    )
}
