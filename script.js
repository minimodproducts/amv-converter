const { FFmpeg } = FFmpegWASM;
const { fetchFile } = FFmpegUtil;

let ffmpeg = null;
const statusEl = document.getElementById('status');
const dropZone = document.getElementById('drop-zone');

const log = (msg) => {
    statusEl.innerText += `\n> ${msg}`;
    statusEl.scrollTop = statusEl.scrollHeight;
}

// Initialize FFmpeg
const loadFFmpeg = async () => {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
        // Only log crucial info to keep display clean
        if(message.includes('frame=') || message.includes('size=')) log(message);
    });
    
    try {
        await ffmpeg.load({
            coreURL: "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js",
        });
        log("Ready! Drop a video file to convert.");
    } catch (e) {
        log("Error loading FFmpeg: " + e.message);
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
    
    if (!ffmpeg) {
        log("FFmpeg not loaded yet. Please wait.");
        return;
    }

    const file = files[0];
    const inputName = 'input.mp4';
    const outputName = 'output.avi';

    log(`Received ${file.name}. Starting conversion...`);

    try {
        // 1. Write file to WASM filesystem
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // 2. Run the Command (Mapped from your AppleScript)
        // Command: -vf scale=320:240... -c:v mjpeg -q:v 3 -c:a adpcm_ima_wav -ac 1 -ar 22050 ...
        await ffmpeg.exec([
            '-i', inputName,
            '-vf', 'scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'mjpeg',
            '-q:v', '3',
            '-vtag', 'MJPG',
            '-bsf:v', 'mjpeg2jpeg', // Essential bitstream filter for compatibility
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
        log("Conversion complete! preparing download...");
        const data = await ffmpeg.readFile(outputName);

        // 4. Create download link
        const blob = new Blob([data.buffer], { type: 'video/x-msvideo' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `CONVERTED_${file.name.split('.')[0]}.avi`;
        a.innerText = `Download ${a.download}`;
        a.style.display = 'block';
        a.style.marginTop = '20px';
        a.style.fontSize = '1.2em';
        
        statusEl.innerHTML = ''; // Clear logs for clean download button
        statusEl.appendChild(a);
        
    } catch (err) {
        log("Error during conversion: " + err.message);
        console.error(err);
    }
});

loadFFmpeg();
