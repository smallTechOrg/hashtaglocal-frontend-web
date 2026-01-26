"use client";
import Dashboard from "../components/dashboard/dashboard";
import Invite from "../components/invite/invite";
import NewsFeed from "../components/news/newsFeed";
import { useScrollTracking, useTimeTracking } from "../hooks/useScrollTracking";

export default function Static() {
    // Analytics tracking for home/static page
    useScrollTracking();
    useTimeTracking('/');

    return (
        <div>
            <Dashboard />
            <NewsFeed />
            <Invite />
        </div>
    )
}