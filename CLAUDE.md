
## Agents For Admin Dashboard

### Folder Structure
  - An `assets` folder for all assets like CSS, JS, and images.
  - A data folder for all JSON files that contain the content for each page.
  - A pages folder for all HTML files that serve as the HTML structure for each page.
  - A scripts folder for any scripts that generate or manipulate the data or pages.
  - Data populates from the JSON files into the HTML pages using JavaScript. fetch API or axios is used to load the JSON data and render it into the HTML structure.`

### Operations
 - A theme will be default and client theme, which can be switched using a theme switcher in the UI.
 - The sidebar menu structure is defined in a JSON file, which allows for easy customization and nesting of menu items.
 - The topbar contains notifications, messages, and profile menu, all of which are populated from their respective JSON files.
 - Each page's content is isolated in its own JSON file, allowing for easy updates and maintenance without touching the HTML structure.
 - The  `main.js` script is responsible for fetching the JSON data and rendering the sidebar, topbar, customizer, footer, and page content dynamically.
 - Use `vite` as a build tool to bundle and optimize the assets for production.
 - No CDN is used for any assets, all assets are served locally to ensure that the application works offline and is not dependent on external resources.


### Rules
- make Single and multiline comments where necessary to explain the code and its functionality.
- Comments Should be backend-friendly and easy to understand for developers who will work on the project in the future.
- Follow consistent naming conventions for variables, functions, and files.
- use ES6+ syntax and features where applicable, such as arrow functions, template literals, and destructuring also use async/await for asynchronous operations.
- Ensure that the code is modular and organized, with separate functions for different tasks.

## UI and UX
- The UI should be responsive and mobile-first, ensuring that it works well on all screen sizes
- Bootstrap 5 should be used for styling and layout, with custom CSS for additional styling as needed.
- The UX should be intuitive and user-friendly, with clear navigation and easy access to all features.

