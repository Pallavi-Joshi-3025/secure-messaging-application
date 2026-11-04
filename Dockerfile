# Minimal image: serve the static secure-messaging app with nginx.
# The app is pure client-side HTML/CSS/JS, so no build step is required.
FROM nginx:1.27-alpine

# Serve on 8080 so the container can run as a non-root user.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy only the static assets the app needs.
COPY index.html /usr/share/nginx/html/
COPY css/   /usr/share/nginx/html/css/
COPY js/    /usr/share/nginx/html/js/
COPY vendor/ /usr/share/nginx/html/vendor/

EXPOSE 8080

# nginx:alpine already defines a sensible CMD; keep it explicit for clarity.
CMD ["nginx", "-g", "daemon off;"]
