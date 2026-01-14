"use client";
import Image from "next/image";


export default function Header() {

    return (
        <header className="relative pt-2 pl-2">
            <Image
                src="./logo-green.png"
                alt="Logo"
                width={65}
                height={0}    
                className="absolute left-2 top-2"
            />
            <div className="flex items-start gap-4 pl-18">
                <div className="flex flex-col justify-start text-left">
                    <h1>#local</h1>
                    <p className="text-sm text-gray-600 !mt-1 !mb-1">a location based community platform</p>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                <div className="h-[1px] w-2/4 bg-gradient-to-r from-transparent via-green to-transparent" />
            </div>
        </header>
    );
}