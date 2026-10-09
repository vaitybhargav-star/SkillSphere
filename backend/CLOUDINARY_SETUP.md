Cloudinary setup for SkillSphere backend

This project supports uploading profile images to Cloudinary. The backend will automatically upload to Cloudinary when the required environment variables are present. If Cloudinary is not configured, uploads will fall back to local storage (public/uploads).

Steps to configure Cloudinary:

1. Create a Cloudinary account
   - Sign up at https://cloudinary.com
   - Open the Dashboard and copy your Cloud Name, API Key and API Secret.

2. Add environment variables to backend/.env (DO NOT commit secrets to version control)

   Example (add these lines to backend/.env):

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   Alternatively you can use CLOUDINARY_URL in the form:
   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

3. (Optional) Create an upload preset for unsigned uploads
   - If you want to allow client-side unsigned uploads, create an "Upload preset" in the Cloudinary Console → Settings → Upload.
   - Configure the preset (allowed formats, folder, size limits). For security, prefer signed server-side uploads.

4. Restart the backend server
   - After adding the env vars, restart the backend (npm run dev or npm start).

What the backend now does:
- Accepts image file uploads via the /api/uploads endpoint (protected route).
- Validates file type and enforces a 5MB size limit server-side.
- When Cloudinary is configured, uploads the file to Cloudinary into folder skillsphere/profile-images with transformations:
  - Max width/height 800px (crop: limit)
  - Automatic quality and format selection (f_auto, q_auto)
- Returns JSON: { success: true, url: <secure_url>, public_id: <public_id> }

Security notes:
- Keep CLOUDINARY_API_SECRET secret. Do not add it to source control.
- The /api/uploads route requires authentication (protect middleware). Do not expose direct unsigned server endpoints without proper checks.

If you want assistance wiring up client-side Cloudinary Upload Widget (unsigned) instead of server-side uploads, ask and provide whether you prefer unsigned client uploads or server-signed uploads.