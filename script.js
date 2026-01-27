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
        // Log progress (frames/size) to keep the user updated
        if(message.includes('frame=') || message.includes('size=')) log(message);
    });

    try {
        log("Downloading FFmpeg core...");
        
        // FIX: We load the worker files as Blobs to bypass the "Cross-Origin" error
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
        
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        log("Ready! Drop a video file to convert.");
    } catch (e) {
        log("Error loading FFmpeg: " + e.message);
        console.error(e);
    }
};

// Handle Drag and Drop
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
        log("FFmpeg is not loaded yet. Please wait a moment.");
        return;
    }

    const file = files[0];
    const inputName = 'input.mp4';
    const outputName = 'output.avi';

    log(`Received ${file.name}. Starting conversion...`);

    try {
        // 1. Write the file to the browser's memory
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // 2. Run the specific conversion command for your old player
        // Note: Using the exact settings from your AppleScript
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

        // 3. Read the result
        log("Conversion complete! Preparing download...");
        const data = await ffmpeg.readFile(outputName);

        // 4. Create the download link
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
        
        statusEl.innerHTML = ''; // Clear logs
        statusEl.appendChild(a);
        
    } catch (err) {
        log("Error during conversion: " + err.message);
        console.error(err);
    }
});

loadFFmpeg();
