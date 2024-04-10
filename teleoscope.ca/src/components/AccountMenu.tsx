import Link from "next/link";

export default function Menu() {
    return (
        <ul>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/dashboard/account">Account</Link></li>
            <li><Link href="/">Sign out</Link></li>
        </ul>
    )
}