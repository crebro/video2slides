import type { FFmpeg } from "@ffmpeg/ffmpeg";
import imageToRGBA from "./rgba-standardization";
import rmsDiff from "./rms-diffs";
import { imagesToOriginalSizePdf } from "./load-image-from-blob";

const getMetadata = (inputFile: string, ffmpeg: FFmpeg): Promise<string> => {
    return new Promise((resolve) => {
        let log = '';
        let metadataLogger = ({ message }: { message: string }) => {
            log += message;
            if (message.indexOf('Aborted()') > -1) {
                ffmpeg.off('log', metadataLogger);
                resolve(log);
            }
        };
        ffmpeg.on('log', metadataLogger);
        ffmpeg.exec(["-i", inputFile]);
    });
};

export const getDuration = async (inputFile: string, ffmpeg: FFmpeg) => {
    var metadata = await getMetadata(inputFile, ffmpeg);
    var patt = /Duration:\s*([0-9]{2}):([0-9]{2}):([0-9]{2}.[0-9]{0,2})/gm
    let m = patt.exec(metadata);

    if (!m) return 0;

    const hours = parseFloat(m[1]);
    const minutes = parseFloat(m[2]);
    const seconds = parseFloat(m[3]);

    return (hours * 3600) + (minutes * 60) + seconds;
};

export const convertToPdf = async (inputFile: string, ffmpeg: FFmpeg) => {
    let duration = await getDuration(inputFile, ffmpeg);

    ffmpeg.on('log', (message: { message: string }) => {
        console.log(message);
    });
    // first convert file into mp4 file
    await ffmpeg.exec([
        '-i', inputFile,
        '-vf', `fps=1/10`, // Extract one frame every 10 seconds
        // '-q:v', '2', // Set quality level (lower is better, 1-31)
        'output_%04d.png'
    ]);

    let allFiles: Array<HTMLImageElement> = [];

    let uint8Store: Uint8Array | null = null;

    for (let i = 1; i <= Math.floor(duration / 10); i++) {
        console.log(`Processing frame ${i}`);
        try {
            const fileName = `output_${i.toString().padStart(4, '0')}.png`;
            const data = await ffmpeg.readFile(fileName);
            // @ts-expect-error
            let buffer = data.buffer;
            let uint8barrayitem = new Uint8Array(buffer);
            // standardize the image to RGBA format, using context
            let rgbaImage = await imageToRGBA(uint8barrayitem);
            uint8barrayitem = rgbaImage.arrayInstance;

            if (uint8Store === null) {
                uint8Store = uint8barrayitem;
            } else {
                if (uint8Store.length !== uint8barrayitem.length) {
                    console.log(`Frame ${i} has different dimensions, updating store.`);
                } else if (rmsDiff(uint8Store, uint8barrayitem) < 5) {
                    console.log(`Skipping frame ${i} as it is identical to the previous frame.`);
                    continue; // Skip identical frames
                }
                // If not identical, update the store
                uint8Store = uint8barrayitem;
            }

            allFiles.push(rgbaImage.imageInstance);
        } catch (e) {
            console.log(
                `Error reading file output_${i.toString().padStart(4, '0')}.png: ${e}`
            );
            break; // Stop if no more files are found
        }
    }

    imagesToOriginalSizePdf(allFiles).then(pdfBlob => {
        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video2doc-output.pdf';
        a.click();

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    })
        .catch(error => {
            console.error('PDF generation failed:', error);
        });;

}
