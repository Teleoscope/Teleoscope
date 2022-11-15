import useSWRAbstract from "../util/swr";


export const authenticateService = {
   authenticateHash,
   verifyToken
}

function authenticateHash(username: string, password: string) {
   const { user } = useSWRAbstract("user", `/api/authenticate/${session_id}`);

}

function verifyToken() {

}