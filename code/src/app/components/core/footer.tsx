export default function Footer() {
    const currentYear = new Date().getFullYear();
    return (
        <footer>
            <span>
                Made with ❤️ © {currentYear} smallTech, India
            </span>
        </footer>
    );
}