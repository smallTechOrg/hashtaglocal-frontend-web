"use client";
import Dashboard from "../components/dashboard/dashboard";
import Invite from "../components/invite/invite";
import NewsFeed from "../components/news/newsFeed";

export default function Static() {
    return (
        <div>
            <Dashboard />
            <NewsFeed />
            <Invite />
        </div>
    )
}