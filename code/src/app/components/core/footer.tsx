import Link from "next/dist/client/link";

export default function Footer() {
    const currentYear = new Date().getFullYear();
    return (
        <footer>
            <span>
                Made with ❤️ © {currentYear}{" "}
                <Link href="https://smalltech.in/?utm_source=local&utm_medium=footer&utm_campaign=launch" target="_blank" rel="noopener noreferrer">
                    smallTech
                </Link>
                , India
            </span>
        </footer>
    );
}