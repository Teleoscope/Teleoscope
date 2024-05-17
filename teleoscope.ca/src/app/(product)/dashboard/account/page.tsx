import Link from "next/link";

export default function Account() {  
  const name = "Paul";        
  const amount_teams_total = 1;
  const amount_teams_used = 1;
  const amount_collaborators_total = 1;
  const amount_collaborators_used = 1;
  const amount_storage_total = 1;
  const amount_storage_used = 1;
  const amount_tokens_total = 1;
  const amount_tokens_used = 1;

  return (
    <main>
      <div>
        <h1>Account</h1>
        
        <h2>Hello, {name}</h2>
        
        <h3>Teams</h3>
        <p>Number of teams total: {amount_teams_total}</p>
        <p>Number of teams used: {amount_teams_used}</p>

        <h3>Collaborators</h3>
        <p>Number of collaborators total: {amount_collaborators_total}</p>
        <p>Number of collaborators total: {amount_collaborators_used}</p>

        <h3>Storage</h3>
        <p>Number of megabytes of storage total: {amount_storage_total}</p>
        <p>Number of megabytes of storage used: {amount_storage_used}</p>

        <h3>Tokens</h3>
        <p>Number of tokens available this month: {amount_tokens_total}</p>
        <p>Number of tokens used this month: {amount_tokens_used}</p>

        <Link href="/dashboard/purchases">Purchases</Link>

      </div>
    </main>
  );
}

