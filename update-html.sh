#!/bin/bash

# Update base href in index.html for Vercel deployment
sed -i 's|<base href="/">|<base href="/ICB-Admin-Panel/">|g' ICB-Admin-Panel/index.html

# Update API endpoints to use production URL
sed -i 's|http://localhost:5005|https://icb-admin-panel-website-projectsvercel-lb0t7hchw.vercel.app|g' ICB-Admin-Panel/js/*.js

echo "HTML and JS files updated for Vercel deployment"