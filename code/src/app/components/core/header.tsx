"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getRouteInfo } from "../../routes";


export default function Header() {
    const pathname = usePathname();
    const { title, linkHref } = getRouteInfo(pathname);

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