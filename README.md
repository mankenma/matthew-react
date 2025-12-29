# Matthew Ankenmann - Portfolio & High Roller Tycoon

This is the source code for [Matthew Ankenmann's personal website](https://matthewankenmann.com). 

It is a hybrid project that serves two distinct purposes:
1.  **Professional Portfolio:** A clean, responsive showcase of experience, skills, and projects built with **React** and **Tailwind CSS**.
2.  **High Roller Tycoon:** A hidden, fully-featured incremental clicker game ("High Roller Tycoon - Ultimate Edition") complete with prestige mechanics, audio systems, and a persistent global leaderboard.

Built with [Astro](https://astro.build) for high performance and zero-JavaScript defaults on static pages.

## 🚀 Features

### 💼 Portfolio (`/`)
* **Modern Design System:** "Slate & Sky" theme using Tailwind CSS with playful interactive elements (Ballpit).
* **Responsive:** Fully mobile-optimized layout.
* **Tech Stack:** React components embedded in Astro pages.

### 🎰 High Roller Tycoon (`/high-roller-tycoon`)
An elaborate "Easter egg" game hidden within the site.
* **Incremental Gameplay:** Click to earn, buy assets (Slot Machines, Poker Tables, etc.), and earn passive income.
* **Prestige System:** Reset progress to earn "Reputation Chips" for permanent multipliers.
* **Audio Engine:** Custom audio context implementation for background jazz and synthesized sound effects (chips, cash, wins).
* **Global Leaderboard:** Real-time ranking system using serverless functions.
* **Save System:** LocalStorage persistence with offline earnings calculation.

## 🛠️ Tech Stack

* **Framework:** [Astro 5.0](https://astro.build/)
* **UI Library:** [React 19](https://react.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/) & FontAwesome
* **Backend/Database:**
    * Serverless API Routes (`src/pages/api/`)
    * [Upstash Redis](https://upstash.com/) / Vercel KV (for Leaderboard data)
* **Deployment:** Netlify (configured via `@astrojs/netlify`)

## 🧞 Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mankenma/matthew-react.git
    cd matthew-react
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory to connect the leaderboard. You will need credentials from Upstash Redis or Vercel KV.

    ```env
    # Example for Upstash/Vercel KV
    KV_REST_API_URL="your_database_url"
    KV_REST_API_TOKEN="your_database_token"
    
    # Optional: Admin/Security secrets
    ADMIN_PASSWORD="your_admin_password"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The site will be available at `http://localhost:4321`.

## 📂 Project Structure

```text
/
├── public/               # Static assets (sounds, favicons)
├── src/
│   ├── assets/           # Images and SVGs
│   ├── components/       # React components (Portfolio.jsx, Ballpit.jsx)
│   ├── layouts/          # Astro layouts
│   ├── pages/
│   │   ├── api/          # Serverless endpoints (leaderboard.ts)
│   │   ├── index.astro   # Main Portfolio
│   │   └── high-roller-tycoon.astro  # The Game
│   └── styles/
└── astro.config.mjs      # Astro configuration
```
