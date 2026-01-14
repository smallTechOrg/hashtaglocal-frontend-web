"use client";
import Image from "next/image";


export default function Header() {

    return (
        <header>
            <div>
                <Image
                    src="./logo-black.png"
                    alt="Logo"
                    width={50}
                    height={0}
                />
            </div>
        </header>
    );
}