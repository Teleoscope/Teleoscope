import { Button, Stack, Typography } from "@mui/material";
import { signOut } from "next-auth/react";


export default function Logout() {

    const handleSignOut = () => {
        signOut({ callbackUrl: `/signin` })
    }

    return (
        <Stack>
            <Typography>Click to sign out.</Typography>
            <Button
            onClick={handleSignOut}
          > Sign out
          </Button>
          </Stack>
    )
}
