const fs = require('fs');
let html = fs.readFileSync('apps/instagram-downloader/index_insta_down.html', 'utf8');

const styleBlock = `
<style>
@keyframes arrow-bounce {
    0% { transform: translateY(-3px); }
    100% { transform: translateY(3px); }
}
.arrow.downloading {
    animation: arrow-bounce 0.5s infinite alternate ease-in-out;
}
.dl-container {
    background: #0b1115;
}
</style>
`;

if (!html.includes('arrow-bounce')) {
    html = html.replace('</head>', styleBlock + '</head>');
}

html = html.replace(/arrow\.style\.opacity = '1';\s*arrow\.style\.transform = 'translateY\(0\) scale\(1\)';/, "arrow.style.opacity = '1'; arrow.classList.add('downloading');");
html = html.replace(/arrow\.style\.opacity = '0';\s*arrow\.style\.transform = 'translateY\(20px\) scale\(0\.5\)';/, "arrow.style.opacity = '0'; arrow.style.transform = 'translateY(20px) scale(0.5)'; arrow.classList.remove('downloading');");


fs.writeFileSync('apps/instagram-downloader/index_insta_down.html', html);
