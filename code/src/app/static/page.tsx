"use client";
import Dashboard from "../components/dashboard/dashboard";
import Invite from "../components/invite/invite";
import { useScrollTracking, useTimeTracking } from "../hooks/useScrollTracking";
import { useState } from "react";
import { CITY_OPTIONS } from "../constants/cityOptions";

export default function Static() {
    // Analytics tracking for home/static page
    useScrollTracking();
    useTimeTracking('/');
    const [selectedCity, setSelectedCity] = useState(CITY_OPTIONS[0].value);

    return (
        <div>
            <Dashboard selectedCity={selectedCity} onCityChange={setSelectedCity} />
            <Invite />
        </div>
    )
}