# Deploying HomeGuardian Dashboard to Vercel

You can deploy this Next.js dashboard to Vercel in two ways: using the **Vercel CLI** (fastest) or via **GitHub**.

## Option 1: Using Vercel CLI (Recommended)

1.  **Install Vercel CLI** (if not installed):
    ```bash
    npm install -g vercel
    ```

2.  **Login to Vercel**:
    ```bash
    vercel login
    ```

3.  **Deploy**:
    Run the following command inside the `dashboard` folder:
    ```bash
    cd dashboard
    vercel
    ```

4.  **Follow the Prompts**:
    - Set up and deploy? **Yes**
    - Which scope? **Select your account**
    - Link to existing project? **No**
    - Project name? **homeguardian-dashboard** (or keep default)
    - In which directory is your code located? **./** (Keep default)
    - Want to modify these settings? **No**

5.  **Environment Variables (Crucial!)**:
    The CLI might ask to import env vars, or you can set them in the Vercel Dashboard later.
    You MUST set these variables in Vercel Project Settings > Environment Variables:

    - `NEXT_PUBLIC_SUPABASE_URL`: (Your Supabase URL)
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)

    *Tip: You can copy these values from your `.env.local` file.*

6.  **Production Deployment**:
    Once tested, deploy to production:
    ```bash
    vercel --prod
    ```

---

## Option 2: Via GitHub

1.  Push your code to a GitHub repository.
2.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
3.  Click **"Add New..."** -> **"Project"**.
4.  Import your GitHub repository.
5.  In the "Environment Variables" section, add:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6.  Click **Deploy**.

## Post-Deployment

After deployment, Vercel will give you a URL (e.g., `https://homeguardian-dashboard.vercel.app`).
You can open this URL on **any device (Mobile, Tablet, Laptop)** to control your main PC remotely! 🌍
