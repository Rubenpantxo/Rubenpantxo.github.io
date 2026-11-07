// Tailwind del Instagram Downloader (npm run css:insta). El CSS se incrusta en
// <style id="tailwind"> de la propia página; ese bloque no se escanea para que
// el resultado no dependa de la compilación anterior.
module.exports = {
    content: {
        files: ['./apps/instagram-downloader/index_insta_down.html'],
        transform: {
            html: (c) => c.replace(/<style id="tailwind">[\s\S]*?<\/style>/, '')
        }
    },
    theme: { extend: {} },
    plugins: []
};
