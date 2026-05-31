const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Rewrite URLs - serve .html files for clean URLs (like Apache .htaccess)
app.use((req, res, next) => {
  // Don't process actual files or directories
  if (req.path.includes('.')) {
    return next();
  }
  
  // Try to serve as .html file
  const htmlPath = path.join(__dirname, req.path + '.html');
  res.sendFile(htmlPath, (err) => {
    if (err) {
      // If .html doesn't exist, try as directory with index.html
      const indexPath = path.join(__dirname, req.path, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(404).sendFile(path.join(__dirname, '404.html'));
        }
      });
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, '500.html'));
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`🚀 Dev server running at http://localhost:${PORT}`);
  console.log(`✅ Clean URLs enabled (e.g., /services/health works)`);
});
