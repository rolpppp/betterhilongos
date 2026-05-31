#!/usr/bin/env node

/**
 * sync-header-footer.js
 * 
 * Syncs the header and footer from index.html to all other HTML files
 * while preserving each page's unique content.
 * 
 * Usage: node scripts/sync-header-footer.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_INDEX = './index.html';
const DIRECTORIES_TO_SCAN = [
  'accessibility',
  'budget',
  'contact',
  'faq',
  'government',
  'legislative',
  'news',
  'privacy',
  'service-details',
  'services',
  'sitemap',
  'statistics',
  'terms'
];

// Markers in the HTML that define section boundaries
const HEADER_START = '<!-- Hotline Bar -->';
const FOOTER_START = '<footer';
const MAIN_CONTENT_ID = 'id="main-content"';

/**
 * Extract header from source HTML
 */
function extractHeader(htmlContent) {
  const headerStartIdx = htmlContent.indexOf(HEADER_START);
  if (headerStartIdx === -1) {
    throw new Error('Could not find header start marker');
  }
  
  // Find where <main> starts
  const mainStartIdx = htmlContent.indexOf('<main id="main-content">');
  if (mainStartIdx === -1) {
    throw new Error('Could not find main content start');
  }
  
  return htmlContent.substring(headerStartIdx, mainStartIdx).trim();
}

/**
 * Extract footer from source HTML
 */
function extractFooter(htmlContent) {
  const footerStartIdx = htmlContent.indexOf(FOOTER_START);
  if (footerStartIdx === -1) {
    throw new Error('Could not find footer start marker');
  }
  
  const bodyCloseIdx = htmlContent.indexOf('</body>');
  if (bodyCloseIdx === -1) {
    throw new Error('Could not find body close tag');
  }
  
  return htmlContent.substring(footerStartIdx, bodyCloseIdx).trim();
}

/**
 * Extract main content from HTML file
 * Handles both new structure (with <!-- Main Content -->) and old structure (with <main> tags)
 */
function extractMainContent(htmlContent) {
  let mainStartIdx, mainEndIdx;
  
  // Try new format first (with <!-- Main Content --> marker)
  const mainCommentMarker = '<!-- Main Content -->';
  const mainCommentIdx = htmlContent.indexOf(mainCommentMarker);
  
  if (mainCommentIdx !== -1) {
    // New format
    mainStartIdx = mainCommentIdx;
    mainEndIdx = htmlContent.indexOf('\n    <footer', mainStartIdx);
  } else {
    // Old format - look for <main id="main-content">
    const mainTagStart = htmlContent.indexOf('<main id="main-content">');
    const mainTagEnd = htmlContent.indexOf('</main>');
    
    if (mainTagStart === -1 || mainTagEnd === -1) {
      throw new Error('Could not find main content boundaries (tried both new and old formats)');
    }
    
    mainStartIdx = mainTagStart;
    mainEndIdx = mainTagEnd + '</main>'.length;
  }
  
  if (mainStartIdx === -1 || mainEndIdx === -1) {
    throw new Error('Could not find main content boundaries');
  }
  
  return htmlContent.substring(mainStartIdx, mainEndIdx).trim();
}

/**
 * Extract <head> section from HTML
 */
function extractHead(htmlContent) {
  const headStart = htmlContent.indexOf('<head');
  const headEnd = htmlContent.indexOf('</head>') + '</head>'.length;
  
  if (headStart === -1 || headEnd === -1) {
    throw new Error('Could not find head section');
  }
  
  return htmlContent.substring(headStart, headEnd);
}

/**
 * Fix relative paths in main content based on file depth
 * Convert between ../assets and assets depending on directory level
 */
function fixMainContentPaths(content, filePath) {
  // Count directory depth (how many slashes = how many directories deep)
  const slashCount = (filePath.match(/\//g) || []).length;
  
  if (slashCount === 0) {
    // Root level (filename.html) - no changes needed
    return content;
  } else {
    // Subdirectory level - ensure ../assets is used
    return content.replace(/href="assets\//g, 'href="../assets/')
                  .replace(/src="assets\//g, 'src="../assets/');
  }
}

/**
 * Fix relative paths in header/footer based on file depth
 * Convert page links to absolute paths for subdirectories
 */
function fixHeaderFooterPaths(content, filePath) {
  // Count directory depth (how many slashes = how many directories deep)
  const slashCount = (filePath.match(/\//g) || []).length;
  
  if (slashCount === 0) {
    // Root level - no changes needed
    return content;
  } else {
    // Subdirectory level - convert relative page links to absolute
    let fixed = content
      // Fix asset paths
      .replace(/href="assets\//g, 'href="../assets/')
      .replace(/src="assets\//g, 'src="../assets/');
    
    // Convert relative page links: href="services/" -> href="/services/"
    const relativeLinks = ['services', 'government', 'legislative', 'budget', 'contact', 'statistics', 'news', 'privacy', 'terms', 'accessibility', 'faq', 'sitemap', 'service-details'];
    
    for (const link of relativeLinks) {
      // Match href="<link>/" and convert to href="/<link>/"
      const pattern = new RegExp(`href="${link}/`, 'g');
      fixed = fixed.replace(pattern, `href="/${link}/`);
      
      // Match href="<link>" (without trailing slash) and convert to href="/<link>"
      const patternNoSlash = new RegExp(`href="${link}"`, 'g');
      fixed = fixed.replace(patternNoSlash, `href="/${link}"`);
      
      // Match href="<link>/<subpage>" patterns
      const patternSubpage = new RegExp(`href="${link}/([^"]+)"`, 'g');
      fixed = fixed.replace(patternSubpage, `href="/${link}/$1"`);
    }
    
    return fixed;
  }
}

/**
 * Rebuild HTML with new header/footer
 */
function rebuildHtml(head, header, mainContent, footer, filePath) {
  // Fix paths based on file's location
  const headFixed = fixHeadPaths(head, filePath);
  const headerFixed = fixHeaderFooterPaths(header, filePath);
  const mainFixed = fixMainContentPaths(mainContent, filePath);
  const footerFixed = fixHeaderFooterPaths(footer, filePath);
  
  return `<!doctype html>
<html lang="en">
  ${headFixed}

  <body>
    <a href="#main-content" class="skip-link" data-i18n="home-skip-to-main-content">Skip to main content</a>

    ${headerFixed}

    ${mainFixed}

    ${footerFixed}
  </body>
</html>`;
}

/**
 * Fix relative paths in head section based on file depth
 */
function fixHeadPaths(head, filePath) {
  // Count directory depth (how many slashes = how many directories deep)
  const slashCount = (filePath.match(/\//g) || []).length;
  
  if (slashCount === 0) {
    // Root level - no changes needed
    return head;
  } else {
    // Subdirectory level - convert assets/ to ../assets/
    return head.replace(/href="assets\//g, 'href="../assets/')
               .replace(/src="assets\//g, 'src="../assets/');
  }
}

/**
 * Recursively find all HTML files in directories
 */
function findHtmlFiles(baseDir) {
  const files = [];
  
  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory: ${dir}`);
    }
  }
  
  for (const dir of DIRECTORIES_TO_SCAN) {
    if (fs.existsSync(dir)) {
      walkDir(dir);
    }
  }
  
  return files;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('📦 Header & Footer Sync Tool');
    console.log('==============================\n');
    
    // Read the root index.html
    console.log(`📖 Reading ${ROOT_INDEX}...`);
    const rootIndexContent = fs.readFileSync(ROOT_INDEX, 'utf8');
    
    // Extract components
    console.log('🔍 Extracting header...');
    const header = extractHeader(rootIndexContent);
    
    console.log('🔍 Extracting footer...');
    const footer = extractFooter(rootIndexContent);
    
    console.log('🔍 Extracting head section...');
    const head = extractHead(rootIndexContent);
    
    // Get all HTML files to update
    console.log('\n📋 Finding HTML files to update...');
    const htmlFiles = findHtmlFiles('.');
    
    if (htmlFiles.length === 0) {
      console.log('⚠️  No HTML files found to update');
      return;
    }
    
    console.log(`✅ Found ${htmlFiles.length} files to update\n`);
    
    // Update each file
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of htmlFiles) {
      try {
        const fileContent = fs.readFileSync(file, 'utf8');
        
        // Extract main content from existing file
        const mainContent = extractMainContent(fileContent);
        
        // Rebuild the file
        const newContent = rebuildHtml(head, header, mainContent, footer, file);
        
        // Write back
        fs.writeFileSync(file, newContent, 'utf8');
        
        console.log(`✅ ${file}`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${file} - Error: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n==============================`);
    console.log(`✅ Success: ${successCount} files`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} files`);
    }
    console.log(`==============================`);
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

main();
