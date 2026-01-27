// Access the libraries from the global window object (loaded via script tags)
const { FFmpeg } = FFmpegWASM;
const { fetchFile, toBlobURL } = FFmpegUtil;

let ffmpeg = null;
const statusEl = document.getElementById('status');
const dropZone = document.getElementById('drop-zone');

const log = (msg) => {
    statusEl.innerText += `\n> ${msg}`;
    statusEl.scrollTop = statusEl.scrollHeight;
}

const loadFFmpeg = async () => {
    ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
        if(message.includes('frame=') || message.includes('size=')) log(message);
    });

    try {
        log("Loading local FFmpeg core...");
        
        // Point to the files we just uploaded to GitHub
        await ffmpeg.load({
            coreURL: 'ffmpeg-core.js',
            wasmURL: 'ffmpeg-core.wasm'
        });

        log("Ready! Drop a video file to convert.");
    } catch (e) {
        log("Error loading FFmpeg: " + e.message);
        console.error(e);
    }
};

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    if (!ffmpeg || !ffmpeg.loaded) {
        log("FFmpeg is not loaded yet. Please wait.");
        return;
    }

    const file = files[0];
    const inputName = 'input.mp4';
    const outputName = 'output.avi';

    log(`Received ${file.name}. Starting conversion...`);

    try {
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        await ffmpeg.exec([
            '-i', inputName,
            '-vf', 'scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'mjpeg',
            '-q:v', '3',
            '-vtag', 'MJPG',
            '-bsf:v', 'mjpeg2jpeg',
            '-c:a', 'adpcm_ima_wav',
            '-ac', '1',
            '-ar', '22050',
            '-map_metadata', '-1',
            '-fflags', '+bitexact',
            '-flags:v', '+bitexact',
            '-f', 'avi',
            outputName
        ]);

        log("Conversion complete! Preparing download...");
        const data = await ffmpeg.readFile(outputName);

        const blob = new Blob([data.buffer], { type: 'video/x-msvideo' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `CONVERTED_${file.name.split('.')[0]}.avi`;
        a.innerText = `Download ${a.download}`;
        a.style.display = 'block';
        a.style.marginTop = '20px';
        a.style.fontSize = '1.2em';
        a.style.color = '#0f0';
        
        statusEl.innerHTML = ''; 
        statusEl.appendChild(a);
        
    } catch (err) {
        log("Error during conversion: " + err.message);
        console.error(err);
    }
});

loadFFmpeg();
