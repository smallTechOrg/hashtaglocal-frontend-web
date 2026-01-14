## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure Breakdown

Inside the `code/` folder, you'll find the actual application source files and config files:

- **`api/`**  
  Contains helper functions that abstract away `fetch` calls to external APIs. Makes code modular and testable.

- **`components/`**  
  All shared UI components go here. These are purely presentational.

- **`constants/`**
  Contains static values to avoid hardcoding and improve maintainability. Helps keep logic clean and updates centralized across the app.

- **`dynamic/`**  
Contains dropdown to select a department from the Met Museum API and fetches the top 10 items from the selected department with their details

- **`hooks/`**  
 Hooks are tools that help the webpage remember things (like user input or choices) and respond when something changes. They make the website interactive and dynamic without using complex code.

- **`models/`**  
  Holds all TypeScript interfaces and types for API data. Keeps models consistent across files.

- **`static/`**  
   Has static hardcoded content with sample text,headings and image. 

  

---


