"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";


export default function Header() {
    const pathname = usePathname();

    return (
        <header>
            <div>
                <Image
                    src="./logo-black.png"
                    alt="Logo"
                    width={60}
                    height={60}

                />
            </div>
        </header>
    );
}