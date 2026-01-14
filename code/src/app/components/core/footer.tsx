export default function Footer() {
    const currentYear = new Date().getFullYear();
    return (
        <footer>
            <span>
                © {currentYear} smallTech
            </span>
        </footer>
    );
}